var mongoose     = require( 'mongoose' );
var Schema       = mongoose.Schema;
var AUTH     = require('../service/auth');
var PUBNUB = require('../service/pubnub');
var async = require( 'async' );
var CHALK =  require( 'chalk' );



var connectionSchema = new Schema(
{
    channel_id : String,
    type : String
});



var relationSchema = new Schema(
{
    target_mid : String,
    target_pubnub_key: String,
    type    : String,
    connect : false,
});


var exploreSchema = new Schema(
{
    action_token:{
        like:String
    },
    image_url: String,
    status: String,
    distance: String,
    like : false,
    connect : false,
});


var MomentSchema   = new Schema(
    {
        mid             : String,
        device_id       : String,
        image_url       : String,
        status          : String,
        complete        : Boolean,
        pubnub_key      : String,
        secret_key      : String,
        date            : { type: Date, default: Date.now },
        location        : { type: [Number], index: '2d' },
        explore         : [exploreSchema],
        liked_relation  : [relationSchema],
        connection      : [connectionSchema],
        current         : String
    });




MomentSchema.methods.createExplore = function( params, nearby_moments, next)
{
    console.log( CHALK.blue('In createExplore:') );
    console.log( CHALK.blue('params: '));
    console.log( params );
    console.log( CHALK.blue('near: '));
    console.log( nearby_moments);
    var generate_explore = function( item, next )
    {
        AUTH.issueActionToken('like',
            {
                target_info:
                {
                    mid          : item.mid,
                    did          : item.device_id,
                    distance     : item.distance
                }
            },{}, function(action_token){
                console.log( 'action_token');
                console.log( action_token);
                var explore_item =
                {
                    action_token : {like: action_token},
                    image_url   : item['image_url'],
                    distance    : item['distance'],
                    status      : item['status'],
                    like        : (item.liked_relation != undefined&&item.liked_relation.length > 0)? true:false,
                    connect     : (item.connection != undefined&&item.connection.length > 0)? true:false,
                };

                next( null, explore_item );
            });

    }

    if( !nearby_moments )
    {
        next(null, null);
    }
    else
    {
        console.log( CHALK.blue('start ex factory '));
        async.map( nearby_moments, generate_explore,
        function onExploreGenerate( err, explore_list )
        {
            console.log( CHALK.blue('in map ex: '));
            next( err, explore_list );
        });
    }
};

MomentSchema.methods.getNear = function( params, next )
{
    console.log( CHALK.blue('In getNear: '));
    console.log( params);

    mongoose.model( 'Moment' ).aggregate(
        {
            $geoNear : {
                near: this.location,
                distanceField: "distance",
                includeLocs: "location",
                maxDistance : 2000
            }},
        {   $limit : params['limit'] },
        {   $project :
            {
                'mid' : 1,
                'pubnub_key': 1,
                'image_url' : 1,
                'status': 1,
                'device_id' : 1,
                'distance':1,
                '_id' : 1,
            }},
        function( err, nearby_moments )
            {
                if (err) throw err;
                console.log( nearby_moments );
                next( err, nearby_moments );
            });

};

MomentSchema.methods.getNearWithRelation = function( params, next )
{
    console.log( CHALK.blue('In getNear: ') );
    mongoose.model( 'Moment' ).find(
        {
            'location' :
            {
                $nearSphere : params['location'],
                $maxDistance : 50,
            },
        },
        {
            status: 1,
            mid : 1,
            image_url : 1,
            liked_relation:
            {
                $elemMatch :
                {
                    target_mid : params['my_mid'],
                }
            },
            connection:
            {
                $elemMatch :
                {
                    target_mid : params['my_mid'],
                }
            },
        })
        .skip( params['offset'] )
        .limit( params['limit'] )
        .exec(
            function( err, nearby_moments )
            {
                if (err) throw err;
                console.log( CHALK.blue('-nearby_moments: ') );
                console.log(  nearby_moments );
                next( err, nearby_moments );
            });
};



MomentSchema.statics.updateExplore = function( my_mid, next )
{
    this.model( 'Moment' ).findOne(
        {
           'mid' : my_mid,
        },
        function onFind( err, mo )
        {
            mo.update(
                {
                    $set :
                    {
                        liked_relation :
                        {
                            'target_mid'    : owner_mid,
                            'connect'       : false,
                        }
                    }
                },
                function onUpdate( err, obj )
                {
                    next( err, obj );
                });
        });
};

MomentSchema.methods.addConnection = function( params, next )
{
    console.log( CHALK.blue('addConnection: ') );
    console.log( this);
    var target_mid = this.liked_relation[0].target_mid;
    var owner_mo = this;
    this.update(
        {
            $addToSet :
            {
                connection :
                {
                    'target_mid'    : target_mid,
                    'channel_id'    : params['channel_id'],
                    'type'          : params['type']
                }
            },
            $pull :
            {
                liked_relation:
                {
                    'target_mid' : target_mid
                }
            }
        },
        function onUpdate( err, num, obj )
        {
            //console.log( CHALK.blue('-addconncetion: ') );
            next( err, obj );
        });
};

MomentSchema.statics.addRemoteConnection = function( params, next )
{
    this.model( 'Moment' ).findOne(
        {
           'mid' : params['target_mid'],
        },
        function onFind( err, mo )
        {
            mo.update(
                {
                    $addToSet :
                    {
                        connection :
                        {
                            'target_mid'    : params['owner_mid'],
                            'channel_id'    : params['channel'],
                            'auth_key'      : params['auth_key'],
                            'type'          : params['type'],
                        }
                    },
                    $pull :
                    {
                        liked_relation:
                        {
                            'target_mid' : params['owner_mid']
                        }
                    }
                },
                function onUpdate( err, obj )
                {
                    PUBNUB.notifyRemote(
                        {
                            type            : 'like',
                            remote_mid          : params['target_mid'],
                            target_mid          : params['owner_mid'],
                            chat_channel_id     : params['channel'],
                            server_channel_id   : mo.device_id,

                        },function(){});

                    console.log( CHALK.blue('-addRemoteconncetion: ') );
                    //console.log(err);
                    next( err, obj );
                });
        });
};

MomentSchema.statics.addRemoteRelation = function( target_mid, my_moment, next )
{

    console.log('connect_token');
    console.log(my_moment);
    console.log(target_mid);
    mongoose.model( 'Moment' ).findOne(
    {
       'mid' : target_mid,
    },
    function onFind( err, mo )
    {
        mo.update(
            {
                $addToSet :
                {
                    liked_relation :
                    {
                        'target_mid'        : my_moment.mid,
                        'connect'           : false,
                        'target_pubnub_key'    : my_moment.pubnub_key
                    }
                }
            },
            function onUpdate( err, obj )
            {
                next( err, obj );
            });
    });


};

MomentSchema.statics.getRelation = function( target_mid, owner_did, res, next )
{
    console.log('get relation');
    console.log(target_mid);
    mongoose.model( 'Moment' ).find(
        {
           'device_id' : owner_did,
        },
        {
            liked_relation:
            {
                $elemMatch :
                {
                    target_mid : target_mid,
                    connect : false
                }
            },
            connection:
            {
                $elemMatch :
                {
                    target_mid : target_mid,
                }
            },
            mid : 1,
            //secret_key:1,
            pubnub_key: 1
        })
        .sort(
            {"date": -1}
        ).limit(1)
        .exec(
            function( err, obj )
            {
                console.log(err);
                console.log(owner_did);
                console.log('obj');
                console.log(obj);
                console.log('err');
                console.log(err);
                if (err) console.log(err);
                if(obj[0]!= null && obj[0].liked_relation != undefined && obj[0].liked_relation.length != 0 ){
                    console.log('liked');
                    next( err, 'liked', obj[0]);
                }
                else if( obj[0] != null && obj[0].connection != undefined && obj[0].connection.length != 0 )
                {
                    next( err, 'already friends', {});
                }
                else
                {
                    next( err, 'initiate like', obj[0]);
                }
            });
};

module.exports = mongoose.model( 'Moment', MomentSchema );