const utils = require('../libs/utils');
const { performance } = require('perf_hooks');

const keyCheck = (key) => {
    if (!key) {
        console.error('Invalid Cache Key:', key);
        throw Error('Cache Key is missing');
    }
};

const buildKey = (prefix, key) => {
    if (!key) throw new Error('Key cannot be null or undefined');
    return prefix ? `${prefix}:${key}` : key;
};

module.exports = ({ prefix, url }) => {
    if (!prefix || !url) throw Error('missing in memory arguments');

    /** creating in-memory client */
    const redisClient = require('./redis-client').createClient({
        prefix,
        url,
    });

    return {
        search: {
            createIndex: async ({ index, prefix, schema }) => {
                if (!schema || !prefix || !index) {
                    throw Error('missing args');
                }
                try {
                    let indices = await redisClient.call('FT._LIST');
                    console.log('indices', indices);

                    if (indices.includes(index)) {
                        await redisClient.call('FT.DROPINDEX', index);
                    }

                    let schemaArgs = [];
                    for (let [field, config] of Object.entries(schema)) {
                        schemaArgs.push(field, config.store);
                        if (config.sortable) {
                            schemaArgs.push('SORTABLE');
                        }
                    }

                    const args = ['FT.CREATE', index, 'ON', 'hash', 'PREFIX', '1', prefix, 'SCHEMA', ...schemaArgs];
                    await redisClient.call(...args);
                } catch (err) {
                    console.error('Error creating index:', err);
                    throw err;
                }
            },

            find: async ({ query, searchIndex, populate, offset = 0, limit = 50 }) => {
                const startTime = performance.now();
                try {
                    let args = ['FT.SEARCH', searchIndex, query, 'LIMIT', offset, limit];
                    if (populate) {
                        args = args.concat(['RETURN', populate.length], populate);
                    }
                    console.log(`search -->`, args.join(' '));
                    let res = await redisClient.call(...args);

                    let [count, ...foundKeysAndSightings] = res;
                    let sightings = foundKeysAndSightings
                        .filter((_, index) => index % 2 !== 0)
                        .map((sightingArray) => {
                            let keys = sightingArray.filter((_, index) => index % 2 === 0);
                            let values = sightingArray.filter((_, index) => index % 2 !== 0);
                            return keys.reduce((obj, key, index) => {
                                obj[key] = values[index];
                                return obj;
                            }, {});
                        });

                    const endTime = performance.now();
                    return { count, docs: sightings, time: `${Math.trunc(endTime - startTime)}ms` };
                } catch (err) {
                    console.error('Error executing search:', err);
                    return { error: err.message || 'unable to execute' };
                }
            },
        },

        hyperlog: {
            add: async ({ key, items }) => {
                try {
                    let args = [buildKey(prefix, key), ...items];
                    await redisClient.call('PFADD', ...args);
                } catch (err) {
                    console.error('Error adding to hyperlog:', err);
                }
            },
            count: async ({ key }) => {
                try {
                    return await redisClient.call('PFCOUNT', buildKey(prefix, key));
                } catch (err) {
                    console.error('Error counting hyperlog:', err);
                    return 0;
                }
            },
            merge: async ({ keys }) => {
                try {
                    let prefixedKeys = keys.map((key) => buildKey(prefix, key));
                    return await redisClient.call('PFMERGE', ...prefixedKeys);
                } catch (err) {
                    console.error('Error merging hyperlog:', err);
                    return 0;
                }
            },
        },

        hash: {
            set: async ({ key, data }) => {
                try {
                    let args = [buildKey(prefix, key)];
                    for (let [field, value] of Object.entries(data)) {
                        args.push(field, value);
                    }
                    return await redisClient.hset(...args);
                } catch (err) {
                    console.error('Error setting hash:', err);
                    return 0;
                }
            },

            get: async ({ key }) => {
                try {
                    return await redisClient.hgetall(buildKey(prefix, key));
                } catch (err) {
                    console.error('Error getting hash:', err);
                    return null;
                }
            },
        },

        key: {
            set: async ({ key, data, ttl }) => {
                try {
                    let args = [buildKey(prefix, key), data];
                    if (ttl) args.push('EX', ttl);
                    await redisClient.set(...args);
                    return true;
                } catch (err) {
                    console.error('Error setting key:', err);
                    return false;
                }
            },

            get: async ({ key }) => {
                try {
                    return await redisClient.get(buildKey(prefix, key));
                } catch (err) {
                    console.error('Error getting key:', err);
                    return null;
                }
            },

            delete: async ({ key }) => {
                try {
                    await redisClient.del(buildKey(prefix, key));
                    return true;
                } catch (err) {
                    console.error('Error deleting key:', err);
                    return false;
                }
            },
        },
    };
};


// return {
//     getTimeSeries: async({
//         key
//     })=>{

//         keyCheck(key);
//         let result = [];
//         key = prefix+":"+key;
//         try{
//             result = await redisClient.call('TS.GET', key);
//         } catch(err){
//             console.log(`!${key} not found. restart the cluster.`);
//         }
//         return result;
//     },
//     // addToTimeSeries: async({

//     // }),
//     appendTimeSeries: async({
//         ktv // array of arrays key value timestamp array
//     })=>{
//         //an array of key value and timestamp
//         let args = [];
//         ktv.forEach(i=>{
//             i[0]=prefix+":"+i[0];
//             args = args.concat(i);
//         });
//         await redisClient.call('TS.MADD', ...args);
//     },
//     createTimeSeries: async({
//         key,
//         retention,
//         labels, //key value
//     })=>{
//         try {
//             let labelsArr = [];
//             Object.keys(labels).forEach(i=>labelsArr.push(i, labels[i]));
//             await redisClient.call('TS.CREATE', prefix+":"+key,  'RETENTION', retention, ...labelsArr);
//         } catch(err){
//             console.log('timeseries key already exists');
//         }
//     },


//     getMulti: async ({ keys }) => {
//         if (!keys || keys.length == 0) return;
//         let results = await redisClient.mget(keys);
//         return results || [];
//     },

//     incrby: async ({ key, n }) => {
//         let result = await redisClient.incrby(key, n || 1);
//         return result;
//     },

//     setCounter: async ({ key, counter, expire }) => {
//         let args = [key, counter];
//         if (expire) args = args.concat(['EX', expire]);
//         let result = await redisClient.set(...args);
//         return result;
//     },




//     pushOne: async ({ key, data }) => {
//         keyCheck(key);
//         let r = await redisClient.lpush(key, data);
//         return r;
//     },

//     limitList: async ({ key, limit }) => {
//         keyCheck(key);
//         let r = await redisClient.ltrim(key, 0, limit);
//         return r;
//     },

//     getList: async ({ key, from, to }) => {
//         keyCheck(key);
//         let r = await redisClient.lrange(key, from, to);
//         return r;
//     },

//     getFullSorted: async ({ key }) => {
//         keyCheck(key);
//         let r = null;
//         try {
//             r = await redisClient.zrange(key, '0', '-1');
//         } catch(err){
//             console.log(err);
//         }

//         return r;
//     },

//     addToSet: async ({ key, data }) => {
//         keyCheck(key);
//         let result = await redisClient.sadd(key, data);
//         return result;
//     },

//     getSetLength: async ({ key }) => {
//         let result = await redisClient.scard(key);
//         return result;
//     },

//     getSet: async ({ key }) => {
//         let result = await redisClient.smembers(key);
//         return result;
//     },
//     setHas: async({key, data})=>{
//         let result = await redisClient.sismember(key, data);
//         return result
//     },

//     removeSortedMember: async({key, member})=>{
//         console.log(`_removeSortedMember-redis------- key: ${key} member: ${member}`)
//         keyCheck(key);
//         let args = [key, member];
//         try {
//             await redisClient.zrem(...args);
//         } catch (err) {
//             console.log(err);
//             console.log(`failed to removeSortedMember for key ${key}`);
//         }
//     },

//     incrSortedMember: async({key, member, score})=>{
//         keyCheck(key);
//         let args = [key, score, member];
//         try {
//             await redisClient.zincrby(...args);
//         } catch (err) {
//             console.log(err);
//             console.log(`failed to incrSortedMember for key ${key}`);
//         }
//     },

//     getSortedMemberScore: async({key, member})=>{
//         keyCheck(key);
//         let args = [key, member];
//         let score = false;
//         try {
//             score = await redisClient.zscore(...args);
//         } catch (err) {
//             console.log(err);
//             console.log(`failed to incrSortedMember for key ${key}`);
//         }
//         return score;
//     },

//     getLowestScore: async({key})=>{
//         keyCheck(key);
//         let args = [key, '-inf', '+inf', 'withScoresS', 'LIMIT', '0', '1'];
//         let result = null
//         try {
//             let out = await redisClient.zrangebyscore(...args);
//             if(out){
//                 result = {member: out[0], score: parseInt(out[1])};
//             }
//         } catch (err) {
//             console.log(err);
//             console.log(`failed to getLowestScore for key ${key}`);
//         }

//         return result;
//         // ZRANGEBYSCORE myset -inf +inf withScoresS LIMIT 0 1
//     },

//     addToSortedList: async ({ key, list }) => {
//         keyCheck(key);
//         let args = [key];
//         list.forEach(i => {
//             args.push(i.score);
//             args.push(i.member);
//         });
//         try {
//             await redisClient.zadd(...args);
//         } catch (err) {
//             console.log(err);
//             console.log(`failed to list for key ${key}`);
//         }
//     },

//     addStream: async({key, json})=>{
//         keyCheck(key);
//         key = prefix+":"+key;
//         let flatten = utils.flattenObject(json);
//         if(flatten.length==0)return;
//         let args = [key, '*'].concat(flatten);
//         try {
//             await redisClient.call('XADD', ...args);
//         } catch(err){
//             console.log(err);
//         }
//     },

//     readStreamLast: async({key, count})=>{
//         keyCheck(key);
//         key=prefix+":"+key;
//         let args = [key, '+', '-', 'COUNT', count||1]
//         let result = null;
//         try {
//             result = await redisClient.call('XREVRANGE', ...args);
//         } catch(err){
//             console.log(err);
//         }
//         return result;
//     },


// }

