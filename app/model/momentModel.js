var mongoose     = require( 'mongoose' );
var Schema       = mongoose.Schema;
var EXPLORE    = require( __dirname +'/momentModel' );
var RELATION    = require( __dirname +'/momentModel' );
var CONNECTION    = require( __dirname +'/connectionModel' );

var async = require( 'async' );
var CHALK =  require( 'chalk' );

var MomentSchema   = new Schema(
{
    mid: String,
    device_id: String,
    image_url: String,
    status: String,
    complete: Boolean,
    date:  { type: Date, default: Date.now },
    location: { type: [Number], index: '2d' },
    explore : [EXPLORE.schema],
    like_relation: [RELATION.schema],
    connection: [CONNECTION.schema]
});

MomentSchema.index( { location: '2dsphere' } );


var AsyncMomentFactory =
{
    generate_explore : function( item, next )
    {
        var explore_item =
            {
                mid : item.mid,
                device_id : item.device_id,
                image_url: item.image_url,
                location : item.location,
                status: item.status,
                like : false,
                connect : false,
                chat_channel: String
            }

        next( null, explore_item );
    },
};



MomentSchema.methods.refreshExplore = function( nearby_moments, next)
{
    if( !nearby_moments )
    {
        next();
    }
    else
    {
        async.map( nearby_moments, AsyncMomentFactory.generate_explore.bind( AsyncMomentFactory ),
            function( err, explore_list )
            {
                console.log( CHALK.blue('In refreshExplore, explore_list: ') );
                console.log( explore_list );
                next( err, explore_list );

            });
    }

}


MomentSchema.methods.getNear = function( params, next )
{
    return this.model( 'Moment' ).find(
    {
        'location' :
        {
            $near : this.location,
            $maxDistance : 50,

        }

    })
    .skip( params['offset'] )
    .limit( params['limit'] )
    .exec(
        function( err, nearby_moments )
        {
            //console.log( CHALK.blue('In getNear, nearby_moments: ') );
            //console.log(  nearby_moments );
            next( err, nearby_moments );
        });
}



MomentSchema.methods.addConnection = function( params, next )
{

    var target_mid = this.like_relation[0].target_mid;
    var owner_mo = this;

    this.update(
        {
            $addToSet :
            {
                connection :
                {
                    'target_mid' : target_mid,
                    'channel_id' : params['channel'],
                    'type' : type
                }
            },
            $pull:
            {
                like_relation:
                {
                    'target_mid' : target_mid
                }
            }

        },
        function( err, num, obj )
        {
            console.log(obj);
            next( err, obj );
        });
}


MomentSchema.statics.addRemoteConnection = function( params, next )
{
    this.model( 'Moment' ).findOne(

        {
           'mid' : params['target_mid'],
        },
        function( err, mo )
        {
            mo.update(
                {
                    $addToSet :
                    {
                        connection :
                        {
                            'target_mid' : params['owner_mid'],
                            'channel_id' : params['channel'],
                            'type' : type
                        }
                    }

                },
                function( err, obj )
                {
                    PUBNUB.notifyRemote(
                    {
                        relation : 'like',
                        remote_mid : params['target_mid'],
                        target_mid : params['owner_mid'],
                        'channel_id' : params['channel']
                    });

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
        function( err, mo )
        {
            mo.update(
                {
                    $addToSet :
                    {
                        like_relation :
                        {
                            'target_mid' : owner_mid,
                            'connect' : false,
                        }
                    }
                },
                function( err, obj )
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
            like_relation:
            {
                $elemMatch :
                {
                    target_mid : target_mid,
                    connect : false
                }
            },
            connection : 1,
            mid : 1

        }
    ,
    function( err, obj )
    {
        //console.log('obj');
        //console.log(obj.like_relation);
        next( err, obj );
    });
}


module.exports = mongoose.model( 'Moment', MomentSchema );