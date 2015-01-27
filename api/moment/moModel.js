var mongoose     = require( 'mongoose' );
var Schema       = mongoose.Schema;
var AUTH     = require('../service/auth');
var PUBNUB = require('../service/pubnub');
var async = require( 'async' );
var CHALK =  require( 'chalk' );
var LOG = require('../service/util').logger;



var MomentSchema   = new Schema(
    {
        actor_id        : String,
        device_id       : String,
        image_url       : String,
        status          : String,
        pubnub_key      : String,
        timestamp       : { type: Date, default: Date.now },
        location        : { type: [Number], index: '2d' },
        expired         : { type: Boolean, default: false },
    });


//MomentSchema.ensureIndex({actor_id:1},{unique:true});
var generate_like = function( item, next )
    {
        LOG.error('gun like');
        LOG.error(item.device_id);
        AUTH.issueActionToken('like',
            {
                target_info:
                {
                    aid          : item.actor_id,
                    distance     : item.distance
                }
            },
            (function(action_token)
            {
                //LOG.error(action_token);
                //token.action_token.like=action_token;
                generate_subscribe({
                    action_token: {like:action_token},
                    image_url   : item['image_url'],
                    distance    : item['distance'],
                    status      : item['status'],
                    explore_id  : item.actor_id
                }, item.device_id,next);
            }).bind(this));
    };

var generate_subscribe = function(item, target_did, next){
    LOG.error('gen sub');
        LOG.error(target_did);
            AUTH.issueActionToken('subscribe',
            {
                target_info:
                {
                    did          : target_did,
                }
            },
            (function(subscribe_token)
            {
                console.log('gen seb done');
                next(null,{
                    action_token: {like: item.action_token.like,subscribe:subscribe_token},
                    image_url   : item['image_url'],
                    distance    : item['distance'],
                    status      : item['status'],
                    explore_id  : item.actor_id
                });
            }).bind(this));
        };
var createExplore = function( nearby_moments, next)
{
    if( !nearby_moments )
    {
        next(null, null);
    }
    else
    {
        async.mapSeries( nearby_moments, generate_like,
        function onExploreGenerate( err, explore_list )
        {
            LOG.info(explore_list);
            if(err) throw err;
            next( err, explore_list );
        });
    }
};

MomentSchema.statics.getExplore =function( params, next )
{
    LOG.error( CHALK.green('In model moment.getExplore') );
//    LOG.error( params);
    mongoose.model( 'Moment' ).aggregate(
        {
            $geoNear : {
                near: [parseFloat(params.lat || 0), parseFloat(params.lon ||0)],
                distanceField: "distance",
                includeLocs: "location",
                maxDistance : 2000
            }},
        {   $limit : 10},
        {   $project :
            {
                'actor_id' : 1,
                'device_id' : 1,
                'pubnub_key': 1,
                'image_url' : 1,
                'status': 1,
                'distance':1,
                'location':1,
                '_id' : 1
            }},
        function( err, nearby_moments )
            {
                LOG.error( 'nearby_moments');
                LOG.error( nearby_moments);
                LOG.error( err);
                LOG.error( params.lat);
                if (err) throw err;
                createExplore(nearby_moments, function (err,explore_list) {
                    //LOG.error('explore_listssss');
                    //LOG.error(explore_list);
                    next(err, explore_list);
                    // body...
                });
            });

};

MomentSchema.statics.isExpired =function( token, next )
{
    this.model( 'Moment' ).find(
        {
           'actor_id' : token.actor_id,
        })
        .limit(1)
        .exec(
            function ( err, mo )
            {
                if(err || mo.length === 0)
                {
                    next(true);
                }
                else//...check if me expired
                {
                    //var current = new Date();
                    //console.log(mo[0].timestamp.getTime()-current>86400000);
                    next(mo[0].expired);
                }

            });
}



MomentSchema.methods.getNearWithRelation = function( params, next )
{
    LOG.info( CHALK.blue('In getNear: ') );
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

                next( err, nearby_moments );
            });
};



module.exports = mongoose.model( 'Moment', MomentSchema );