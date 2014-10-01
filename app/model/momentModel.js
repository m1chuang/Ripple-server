var mongoose     = require( 'mongoose' );
var Schema       = mongoose.Schema;
var EXPLORE    = require( __dirname +'/momentModel' );
var RELATION    = require( __dirname +'/momentModel' );
var CONNECTION    = require( __dirname +'/connectionModel' );
var PUBNUB = require('../controller/pubnub');
var async = require( 'async' );
var CHALK =  require( 'chalk' );

var relationList = new Schema(
{
    target_mid : String,
    type    : String,    
});

var MomentSchema   = new Schema(
    {
        mid             : String,
        device_id       : String,
        image_url       : String,
        status          : String,
        complete        : Boolean,
        date            : { type: Date, default: Date.now },
        location        : { type: [Number], index: '2d' },
        explore         : [EXPLORE.schema],
        liked_relation  : [RELATION.schema],
        connection      : [CONNECTION.schema],
        //relation_history: [relationList],
        current         : String
    });


MomentSchema.index( { location: '2dsphere' } );

var AsyncMomentFactory =
{
    generate_explore : function( item, next )
    {
        console.log('item');
        console.log(item);
        console.log((item.liked_relation != undefined&&item.liked_relation.length > 0)? true:false);
        var explore_item =
            {
                mid         : item.mid,
                device_id   : item.device_id,
                image_url   : item.image_url,
                location    : item.location,
                status      : item.status,
                like        : (item.liked_relation != undefined&&item.liked_relation.length > 0)? true:false,
                connect     : (item.connection != undefined&&item.connection.length > 0)? true:false,
                chat_channel: String
            }

        next( null, explore_item );
    },
};

MomentSchema.methods.createExplore = function( nearby_moments, next)
{
    console.log( CHALK.blue('In createExplore:') );
    if( !nearby_moments )
    {
        next();
    }
    else
    {

        async.map( nearby_moments, AsyncMomentFactory.generate_explore.bind( AsyncMomentFactory ),
            function onExploreGenerate( err, explore_list )
            {
                //console.log( CHALK.blue('-explore_list: ') );
                //console.log( explore_list );
                //console.log( this );
                next( err, explore_list );
            });
    }
}

MomentSchema.methods.getNear = function( params, next )
{
    console.log( CHALK.blue('In getNear: ') );        
    this.model( 'Moment' ).find(
        {
            'location' :
            {
                $nearSphere : this.location,                        
                $maxDistance : 50,
            },

        },
        {            
            status: 1,            
            mid : 1,
            image_url : 1,
            
        
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
}

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
}


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
}

MomentSchema.methods.addConnection = function( params, next )
{

    console.log( CHALK.blue('addConnection: ') );     
    //console.log( this.liked_relation[0].target_mid );    
    //console.log( this.liked_relation );  
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
                    'auth_key'      : params['auth_key'],
                    'type'          : params['type']
                },
                /*
                relation_history :
                {
                    'target_mid'    : target_mid,
                    'type'          : 'connect'
                }*/
            },
            $pull :
            {
                liked_relation:
                {
                    'target_mid' : target_mid
                }/*,
                relation_history :
                {
                    'target_mid'    : params['owner_mid'],
                    'type'          : params['type']
                }*/
            }

        },
        function onUpdate( err, num, obj )
        {
            //console.log( CHALK.blue('-addconncetion: ') );
            //console.log(obj);
            //console.log(err);
            next( err, obj );
        });
}

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
                            'type'          : params['type']
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

                            //using server master key
                            //auth_key : params['auth_key']
                        },function(){});
                    console.log( CHALK.blue('-addRemoteconncetion: ') );
                    //console.log(err);
                    next( err, obj );
                });
        });
}


MomentSchema.statics.addRemoteRelation = function( target_mid, owner_mid, next )
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
}

MomentSchema.statics.getRelation = function( target_mid, owner_did, next )
{
    this.model( 'Moment' ).findOne(
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
            connection : 1,
            mid : 1
        },
        function( err, obj )
        {
            console.log(err)
            console.log('obj');
            console.log(obj);
            next( err, obj );
        });
}

module.exports = mongoose.model( 'Moment', MomentSchema );