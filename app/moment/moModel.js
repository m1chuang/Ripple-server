var mongoose     = require( 'mongoose' );
var Schema       = mongoose.Schema;
var AUTH     = require('../service/auth');
var PUBNUB = require('../service/pubnub');
var async = require( 'async' );
var CHALK =  require( 'chalk' );

var relationList = new Schema(
{
    target_mid : String,
    type    : String,
});

var connectionSchema = new Schema(
{
    channel_id : String,
    type : String
})

var relationSchema = new Schema(
{
    target_mid : String,
    type    : String,
    connect : false,
})


var exploreSchema = new Schema(
{
    mid : String,
    image_url: String,
    status: String,
    distance: String,
    like : false,
    connect : false,
})


var MomentSchema   = new Schema(
    {
        mid             : String,
        device_id       : String,
        image_url       : String,
        status          : String,
        complete        : Boolean,
        pubnub_key : String,
        secret_key      : String,
        date            : { type: Date, default: Date.now },
        location        : { type: [Number], index: '2d' },
        explore         : [exploreSchema],
        liked_relation  : [relationSchema],
        connection      : [connectionSchema],
        current         : String
    });



var AsyncMomentFactory =
{
    generate_explore : function( item, next )
    {
        var action_token = AUTH.issueActionToken('like',
            {
                target_mid          : item.mid,
                target_did          : item.device_id,
                target_distance     : item.distance
            });
        var explore_item =
        {
            action_like : action_token,
            image_url   : item.image_url,
            distance    : item.distance,
            status      : item.status,
            like        : (item.liked_relation != undefined&&item.liked_relation.length > 0)? true:false,
            connect     : (item.connection != undefined&&item.connection.length > 0)? true:false,
            chat_channel: String,
        };

        next( null, explore_item );
    },
};

MomentSchema.methods.createExplore = function( params, nearby_moments, next)
{
    console.log( CHALK.blue('In createExplore:') );

    if( !nearby_moments )
    {
        next(null, null);
    }
    else
    {
        async.map( nearby_moments, AsyncMomentFactory.generate_explore.bind( {my_moment_secrete_key:params['my_moment_secret_key']} ),
            function onExploreGenerate( err, explore_list )
            {
                next( err, explore_list );
            });
    }
};

MomentSchema.methods.getNear = function( params, next )
{
    console.log( CHALK.blue('In getNear: ') );

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
                '_id' : 1,
                'distance' : 1
            }},
        function( err, nearby_moments )
            {
                //if (err) throw err;
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

MomentSchema.statics.getDevice = function( mid , next)
{
    this.model( 'Moment' ).findOne(
        {
           'mid' : mid,
        },
        function onFind( err, mo )
        {
            console.log( CHALK.blue('-get did: ') );
            console.log(  mo.device_id );
            next( err, mo, 'u');
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
    this.model( 'Moment' ).findOne(
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
                            'action_connect'    : AUTH.issueActionToken('connect',
                                                    {
                                                        pubnub_key:my_moment.pubnub_key
                                                    }, my_moment.secret_key)
                        }
                    }
                },
                function onUpdate( err, obj )
                {
                    next( err, obj );
                });
        });
};

MomentSchema.statics.getRelation = function( target_mid, owner_did, target_secret, res, next )
{
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
            secret_key:1,
            pubnub_key: 1
        })
        .sort(
            {"date": -1}
        ).limit(1)
        .exec(
            function( err, obj )
            {
                console.log(err);
                console.log('obj');
                console.log(obj);

                if(obj!= null && obj.liked_relation != undefined && obj.liked_relation.length != 0 ){
                    AUTH.verifySecret(target_secret, obj.secret_key, res,
                        function(payload)
                        {
                            next( err, 'liked', obj[0], payload );
                        });
                }
                else if( my_moment != null && my_moment.connection != undefined && my_moment.connection.length != 0 )
                {
                    next( err, 'already friends', {}, {});
                }
                else
                {
                    next( err, 'initiate like', {}, {});
                }
            });
};

module.exports = mongoose.model( 'Moment', MomentSchema );