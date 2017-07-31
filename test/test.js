//
//=== Import Required Modules ==================================================
//

// import the module under test
const Databridge = require('../');

// import validateParams for access to the error prototype and other utilities
const validateParams = require('@maynoothuniversity/validate-params');
const validate = validateParams.validateJS();

// import file system support - use fs-extra to avoid adding extra dependencies
const fs = require('fs-extra');
const path = require('path');

// import time handling support - needed for testing timestamps
const moment = require('moment');

//
//=== Test Suite Setup =========================================================
//

/**
 * The path to the dummy cache dir used during testing
 */
const CACHEDIR_NAME = 'databridgeJsonCache';
const CACHEDIR_RELATIVE = path.join('.', CACHEDIR_NAME);
const CACHEDIR_ABSOLUTE = path.resolve(__dirname, CACHEDIR_RELATIVE);

// add an event handler to empty the cache dir each time the test suite runs
QUnit.begin(function(){
    fs.emptyDirSync(CACHEDIR_ABSOLUTE);
});


//
//=== Utility Variables & Functions ============================================
//

/**
 * An object containing dummy data. The pieces of dummy data are indexed by
 * names, and each piece of dummy data is itself an object indexed by `desc` (a
 * description) and `val` (the dummy value).
 *
 * This object is re-built before each test
 * 
 * @type {Object.<string, {desc: string, val: *}>}
 */
var DUMMY_DATA = {};

/**
 * An object just like {@link DUMMY_DATA}, but limited to just the basic types
 * returned by typeof.
 * 
 * @see DUMMY_DATA
 */
var DUMMY_BASIC_TYPES = {};

// add a callback to reset the dummy data before each test
QUnit.testStart(function() {
    DUMMY_DATA = {
        undef: {
            desc: 'undefined',
            val: undefined
        },
        bool: {
            desc: 'a boolean',
            val: true
        },
        num: {
            desc: 'a number',
            val: 42,
        },
        str_empty: {
            desc: 'an empty string',
            val: ''
        },
        str: {
            desc: 'a generic string',
            val: 'boogers!'
        },
        arr_empty: {
            desc: 'an emptyy array',
            val: [],
        },
        arr: {
            desc: 'an array',
            val: [1, 2, 3],
        },
        obj_empty: {
            desc: 'an empty plain object',
            val: {},
        },
        obj: {
            desc: 'a plain object',
            val: {b: 'boogers'}
        },
        obj_proto: {
            desc: 'a prototyped object',
            val: new Error('dummy error object')
        },
        fn: {
            desc: 'a function object',
            val: function(a,b){ return a + b; }
        }
    };
    DUMMY_BASIC_TYPES = {
        undef: DUMMY_DATA.undef, 
        bool: DUMMY_DATA.bool,
        num: DUMMY_DATA.num,
        str: DUMMY_DATA.str,
        arr: DUMMY_DATA.arr,
        obj: DUMMY_DATA.obj,
        fn: DUMMY_DATA.fn
    };
});

/**
 * A function to return a dummy value given a type name, i.e. an index on
 * {@link DUMMY_DATA}.
 *
 * @params {string} typeName
 * @returns {*} the `val` of the appropriate entry in {@link DUMMY_DATA}.
 */
function dummyVal(typeName){
    return DUMMY_DATA[typeName].val;
}

/**
 * A function to return the description of a dummy value given a type name, i.e.
 * an index on {@link DUMMY_DATA}.
 *
 * @params {string} typeName
 * @returns {string} the `desc` of the appropriate entry in {@link DUMMY_DATA}.
 */
function dummyDesc(typeName){
    return DUMMY_DATA[typeName].desc;
}

/**
 * A function to return the names of all dummy basic types not explicitly
 * excluded.
 *
 * @param {...string} typeName - the names of the types to exclude from the
 * returned list.
 * @returns Array.<string> the names of all the dummy basic types except those
 * excluded by the passed arguments as an array of strings.
 */
function dummyBasicTypesExcept(){
    // build and exclusion lookup from the arguments
    var exclude_lookup = {};
    for(var i = 0; i < arguments.length; i++){
        exclude_lookup[arguments[i]] = true;
    }
    
    // build the list of type names not excluded
    var ans = [];
    Object.keys(DUMMY_BASIC_TYPES).sort().forEach(function(tn){
        if(!exclude_lookup[tn]){
            ans.push(tn); // save the type name if not excluded
        }
    });
    
    // return the calculated list
    return ans;
}

//
//=== Define Tests =============================================================
//

QUnit.module('custom validators', {}, function(){
    QUnit.test('custom validators registered', function(a){
        a.expect(2);
        a.strictEqual(typeof validate.validators.folderExists, 'function', 'folderExists is registered');
        a.strictEqual(typeof validate.validators.iso8601, 'function', 'iso8601 is registered');
    });
    
    QUnit.test('the folderExists validator', function(a){
        a.expect(4);
        a.strictEqual(typeof validate.validators.folderExists(undefined, true), 'undefined', 'undefined passes');
        a.ok(!validate.isDefined(validate.validators.folderExists(path.join(__dirname, '..', 'lib'), true)), 'existing folder passes');
        a.ok(validate.isString(validate.validators.folderExists('/thingys', true)), 'non-existing path returns error message');
        a.ok(validate.isString(validate.validators.folderExists('./package.jason', true)), 'path to file returns error message');
    });
    
    QUnit.test('the iso8601 validator', function(a){
        a.expect(5);
        a.strictEqual(typeof validate.validators.iso8601(undefined, true), 'undefined', 'undefined passes');
        a.strictEqual(typeof validate.validators.iso8601('', true), 'undefined', 'empty string passes');
        a.ok(!validate.isDefined(validate.validators.iso8601('2017-07-27T10:28:53', true)), 'valid date passes');
        a.ok(validate.isString(validate.validators.iso8601('thingys', true)), 'invalid date return error message');
        a.ok(validate.isString(validate.validators.iso8601(42, true)), 'non-string returns error message');
    });
    
    //QUnit.test('the promise validator', function(a){
    //    a.expect(4);
    //    a.strictEqual(typeof validate.validators.promise(undefined, true), 'undefined', 'undefined passes');
    //    a.ok(validate.isDefined(validate.validators.promise('', true)), 'empty string returns error message');
    //    a.ok(!validate.isDefined(validate.validators.promise(Promise.resolve(true), true)), 'a resolved promise passes');
    //    a.ok(!validate.isDefined(validate.validators.promise(Promise.reject(new Error('test')), true)), 'a rejected promise passes');
    //});
});

QUnit.module('The Databridge class', {}, function(){
    QUnit.test('class exists', function(a){
        a.equal(typeof Databridge, 'function');
    });
    
    QUnit.module('constructor', {}, function(){
        QUnit.test('building default object', function(a){
            a.expect(3);
            var db = new Databridge();
            a.ok(db instanceof Databridge, 'object successfully constructed without args');
            a.strictEqual(db._options.cacheDir, path.join('.', CACHEDIR_NAME), 'cache dir defaulted to expected value');
            a.strictEqual(db._options.defaultCacheTTL, 3600, 'default cache TTL defaulted to expected value');
        });
        
        QUnit.test('specified options correctly stored', function(a){
            a.expect(2);
            var testPath = './';
            var testTTL = 300;
            var db = new Databridge({cacheDir: testPath, defaultCacheTTL: testTTL});
            a.strictEqual(db._options.cacheDir, testPath, 'cache dir correctly stored');
            a.strictEqual(db._options.defaultCacheTTL, testTTL, 'default cache TTL correctly stored');
        });
        
        QUnit.test('._datasources correctly initialised', function(a){
            a.expect(1);
            var db = new Databridge();
            a.deepEqual(db._datasources, {});
        });
    });
    
    QUnit.module('.option() read-only accessor',
        {
            beforeEach: function(){
                this.db = new Databridge({ cacheDir: './', defaultCacheTTL: 500 });
            }
        },
        function(){
            QUnit.test('function exists', function(a){
                a.ok(validate.isFunction(this.db.option));
            });
            
            QUnit.test('defined option returns as expected', function(a){
                a.strictEqual(this.db.option('defaultCacheTTL'), 500);
            });
            
            QUnit.test('non-existent option returns undefined', function(a){
                a.strictEqual(typeof this.db.option('thingy'), 'undefined');
            });
        }
    );
    
    QUnit.module(
        '.registerDatasource() & .datasource() instance methods',
        {
            beforeEach: function(){
                this.db = new Databridge({ cacheDir: './' });
                this.ds = new Databridge.Datasource('testDS', function(){ return true; });
            }
        },
        function(){
            QUnit.test('methods exist', function(a){
                a.expect(4);
                a.equal(typeof this.db.registerDatasource, 'function', '.registerDatasource() exists');
                a.strictEqual(this.db.register, this.db.registerDatasource, '.register() is an alias for .registerDatasource()');
                a.equal(typeof this.db.datasource, 'function', '.datasource() exists');
                a.strictEqual(this.db.source, this.db.datasource, '.source() is an alias for .datasource()');
            });
            
            QUnit.test('name clashes prevented on registration', function(a){
                a.expect(2);
                this.db.registerDatasource(this.ds);
                a.throws(
                    function(){
                        this.db.registerDatasource(new Databridge.Datasource('testDS', function(){}));
                    },
                    Error,
                    'clashing datasource name rejected'
                );
                a.throws(
                    function(){
                        this.db.registerDatasource(new Databridge.Datasource('option', function(){}));
                    },
                    Error,
                    'datasource name that clashes with instance method name rejected'
                );
            });
            
            QUnit.test('function chanining supported by registration function', function(a){
                a.strictEqual(this.db.registerDatasource(this.ds), this.db);
            });
            
            QUnit.test('source correctly registered & fetched', function(a){
                a.expect(3);
                this.db.registerDatasource(this.ds);
                a.strictEqual(this.db._datasources[this.ds.name()], this.ds, 'datasource saved in ._datasources property with correct name');
                a.strictEqual(typeof this.db[this.ds.name()], 'function', 'shortcut function added for datasource');
                a.strictEqual(this.db.datasource(this.ds.name()), this.ds, 'datasource retrieved with .datasource() accessor');
            });
            
            QUnit.test('.datasource() returns undefined for unregistered sources', function(a){
                a.strictEqual(typeof this.db.datasource('thingys'), 'undefined');
            });
            
            QUnit.test('.source() is a shortcut to .datasource()', function(a){
                a.strictEqual(this.db.source, this.db.datasource);
            });
        }
    );
    
    QUnit.module('data fetching and caching',
        {
            beforeEach: function(){
                this.db = new Databridge({cacheDir: CACHEDIR_ABSOLUTE});
                let dummyData = ['thingys', 'whatsitis'];
                this.dummyData = dummyData;
                this.dsName = 'testDS';
                this.ds = new Databridge.Datasource(this.dsName, function(){ return dummyData; }, {enableCaching: false});
                this.db.registerDatasource(this.ds);
            }
        },
        function(){
            QUnit.test('fetch instance methods exist', function(a){
                a.expect(3);
                var db = new Databridge();
                a.ok(validate.isFunction(db.fetchResponse), '.fetchResponse() exists');
                a.ok(validate.isFunction(db.fetchDataPromise), '.fetchDataPromise() exists');
                a.strictEqual(db.fetch, db.fetchResponse, '.fetch() is an alias to .fetchResponse()');
            });
        
            QUnit.test('.fetchResponse() from data source that returns immediately with caching disabled', function(a){
                a.expect(3);
                
                var dummyData = this.dummyData;
                var done = a.async();
                var fr = this.db.fetchResponse(this.dsName, {}, []);
                a.ok(fr instanceof Databridge.FetchResponse, 'a FetchResponse object returned');
                a.ok(validate.isPromise(fr.dataPromise()), 'the response object contains a data promise');
                if(validate.isPromise(fr.dataPromise())){
                    fr.dataPromise().then(
                        function(d){
                            a.deepEqual(d, dummyData, 'data promise resolves to expected value');
                            done();
                        },
                        function(err){
                            console.error('data promise rejected with error', err);
                            done();
                        }
                    );
                }else{
                    done();
                }
            });
            
            QUnit.test('.fetchDataPromise() from data source that returns immediately with caching disabled', function(a){
                a.expect(2);
                
                var dummyData = this.dummyData;
                var done = a.async();
                var dp = this.db.fetchDataPromise(this.dsName, {}, []);
                a.ok(validate.isPromise(dp), 'returns a promise');
                if(validate.isPromise(dp)){
                    dp.then(
                        function(d){
                            a.deepEqual(d, dummyData, 'data promise resolves to expected value');
                            done();
                        },
                        function(err){
                            console.error('data promise rejected with error', err);
                            done();
                        }
                    );
                }else{
                    done();
                }
            });
            
            QUnit.test('cache writting', function(a){
                a.expect(7);
                
                var dummyData = this.dummyData;
                var cachingDS = new Databridge.Datasource('testCachingDS', function(){ return dummyData; });
                this.db.register(cachingDS);
                var done = a.async();
                
                var fr = this.db.fetchResponse('testCachingDS', {}, []);
                a.ok(validate.isPromise(fr.dataPromise()), 'the response object contains a data promise');
                if(validate.isPromise(fr.dataPromise())){
                    fr.dataPromise().then(
                        function(d){
                            a.deepEqual(d, dummyData, 'data promise resolved to expected value');
                            a.ok(validateParams.isPlainObject(fr.meta('cacheWrite')), 'cacheWrite metadata is a plain object');
                            a.ok(validate.isString(fr.meta('cacheWrite').path), 'cacheWrite.path metadata is a string');
                            a.ok(fs.existsSync(fr.meta('cacheWrite').path), 'cache file exists on disk');
                            a.notOk(validate.single(fr.meta('cacheWrite').timestamp, { presence: true, iso8601: true }),'cacheWrite.timestamp metadata is an ISO8601 string');
                            a.deepEqual(fs.readJsonSync(fr.meta('cacheWrite').path).data, dummyData, 'correct data cached');
                            done();
                        },
                        function(err){
                            console.error('data promise rejected with error', err);
                            done();
                        }
                    );
                }else{
                    done();
                }
            });
        }
    );
});

QUnit.module('The Databridge.Datasource class', {}, function(){
    QUnit.test('class exists', function(a){
        a.equal(typeof Databridge.Datasource, 'function');
    });
    
    QUnit.module('constructor', {}, function(){
        QUnit.test('required arguments & defaults', function(a){
            a.expect(6);
            a.throws(
                function(){
                    new Databridge.Datasource();
                },
                validateParams.ValidationError,
                'throws error when no arguments are passed'
            );
            a.throws(
                function(){
                    new Databridge.Datasource('test');
                },
                validateParams.ValidationError,
                'throws error when only a name is passed'
            );
            var defDS = new Databridge.Datasource('test', function(){});
            a.ok(defDS, 'no error thrown when passed both a name and a callback but no options');
            a.strictEqual(defDS._options.enableCaching, true, 'caching enabled by default');
            a.strictEqual(typeof defDS._options.cacheTTL, 'undefined', 'no custom cache TTL set by default');
            a.ok(new Databridge.Datasource('test', function(){}, {cacheTTL: 300}), 'no error thrown when passed both a name, a callback, and options');
        });
        
        QUnit.test('data correctly stored', function(a){
            a.expect(4);
            var testName = 'test';
            var testFn = function(){ return true; };
            var testTTL = 500;
            var testCacheEnable = false;
            var ds = new Databridge.Datasource(testName, testFn, {cacheTTL: testTTL, enableCaching: testCacheEnable});
            a.strictEqual(ds._name, testName, 'name successfully stored');
            a.strictEqual(ds._dataFetcher, testFn, 'data fether callback successfully stored');
            a.strictEqual(ds._options.enableCaching, testCacheEnable, 'cache enabling option successfully stored');
            a.strictEqual(ds._options.cacheTTL, testTTL, 'cache TTL option successfully stored');
        });
    });
    
    QUnit.module(
        'read-only accessors',
        {
            beforeEach: function(){
                this.df = function(){ return true; };
                this.ds = new Databridge.Datasource('test', this.df, { enableCaching: true, cacheTTL: 300 });
            }
        },
        function(){
            QUnit.test('.name() exists', function(a){
                a.ok(validate.isFunction(this.ds.name));
            });
            
            QUnit.test('.name() returns expected value', function(a){
                a.strictEqual(this.ds.name(), 'test');
            });
            
            QUnit.test('.dataFetcher() exists', function(a){
                a.ok(validate.isFunction(this.ds.dataFetcher));
            });
            
            QUnit.test('.dataFetcher() returns expected value', function(a){
                a.strictEqual(this.ds.dataFetcher(), this.df);
            });
            
            QUnit.test('.option() exists', function(a){
                a.ok(validate.isFunction(this.ds.option));
            });
            
            QUnit.test('.option() returns expected values', function(a){
                a.expect(2);
                a.strictEqual(this.ds.option('cacheTTL'), 300, 'expected value returned for defined option');
                a.strictEqual(typeof this.ds.option('thingy'), 'undefined', 'undefined returned for un-specified option');
            });
        }
    );
    
    QUnit.test('data fetching', function(a){
        a.expect(1);
        
        //var db = new Databridge();
        var dummyData = { a: 'b', c: 'd' };
        var ds = new Databridge.Datasource('testDS', function(){ return dummyData; });
        var done = a.async();
        var dp = ds.fetchDataPromise();
        dp.then(
            function(d){
                a.deepEqual(d, dummyData, 'promise resolved to expected value');
                done();
            },
            function(){
                done();
            }
        );
    });
});

QUnit.module('The Databridge.FetchRequest class', {}, function(){
    QUnit.test('class exists', function(a){
        a.equal(typeof Databridge.FetchRequest, 'function');
    });
    
    QUnit.module('constructor', {}, function(){
        QUnit.test('required arguments', function(a){
            a.expect(6);
            var db = new Databridge();
            var ds = new Databridge.Datasource('testDS', function(){ return true; });
            a.throws(
                function(){
                    new Databridge.FetchRequest();
                },
                validateParams.ValidationError,
                'throws error when no arguments are passed'
            );
            a.throws(
                function(){
                    new Databridge.FetchRequest(db);
                },
                validateParams.ValidationError,
                'throws error when only a bridge is passed'
            );
            a.throws(
                function(){
                    new Databridge.FetchRequest(db, ds);
                },
                validateParams.ValidationError,
                'throws error when only a bridge and source are passed'
            );
            a.throws(
                function(){
                    new Databridge.FetchRequest(db, ds, {});
                },
                validateParams.ValidationError,
                'throws error when only a bridge, source, and options are passed'
            );
            a.throws(
                function(){
                    new Databridge.FetchRequest(db, ds, {}, []);
                },
                validateParams.ValidationError,
                'throws error when only a bridge, source, options, and params are passed'
            );
            a.ok(new Databridge.FetchRequest(db, ds, {}, [], moment().toISOString()), 'no error thrown when passed all params');
        });
        
        QUnit.test('data correctly stored', function(a){
            a.expect(5);
            var db = new Databridge();
            var ds = new Databridge.Datasource('testDS', function(){ return true; });
            var opts = { enableCaching: true };
            var params = [true];
            var ts = moment().toISOString();
            var fr = new Databridge.FetchRequest(db, ds, opts, params, ts);
            a.strictEqual(fr._bridge, db, 'databridge successfully stored');
            a.strictEqual(fr._source, ds, 'datasource successfully stored');
            a.strictEqual(fr._fetchOptions, opts, 'fetch options successfully stored');
            a.strictEqual(fr._fetcherParams, params, 'fetcher parans successfully stored');
            a.strictEqual(fr._timestamp, ts, 'timestamp successfully stored');
        });
    });
    
    QUnit.module(
        'read-only accessors',
        {
            beforeEach: function(){
                this.db = new Databridge;
                this.ds = new Databridge.Datasource('test', function(){ return true; });
                this.opts = { cacheTTL: 300 };
                this.params = [true];
                this.ts = moment().toISOString();
                this.fr = new Databridge.FetchRequest(this.db, this.ds, this.opts, this.params, this.ts);
            }
        },
        function(){
            QUnit.test('.databridge() & .bridge()', function(a){
                a.expect(3);
                a.ok(validate.isFunction(this.fr.databridge), '.databridge() exists');
                a.strictEqual(this.fr.databridge(), this.db, 'returns expected value');
                a.strictEqual(this.fr.databridge, this.fr.bridge, '.bridge() is alias for .databridge()');
            });
            
            QUnit.test('.datasource() & .source()', function(a){
                a.expect(3);
                a.ok(validate.isFunction(this.fr.datasource), '.datasource() exists');
                a.strictEqual(this.fr.datasource(), this.ds, 'returns expected value');
                a.strictEqual(this.fr.datasource, this.fr.source, '.source() is alias for .datasource()');
            });
            
            QUnit.test('.fetchOptions() & .options()', function(a){
                a.expect(3);
                a.ok(validate.isFunction(this.fr.fetchOptions), '.fetchOptions() exists');
                a.strictEqual(this.fr.fetchOptions(), this.opts, 'returns expected value');
                a.strictEqual(this.fr.fetchOptions, this.fr.options, '.options() is alias for .fetchOptions()');
            });
            
            QUnit.test('.fetcherParams() & .params()', function(a){
                a.expect(3);
                a.ok(validate.isFunction(this.fr.fetcherParams), '.fetcherParams() exists');
                a.strictEqual(this.fr.fetcherParams(), this.params, 'returns expected value');
                a.strictEqual(this.fr.fetcherParams, this.fr.params, '.params() is alias for .fetcherParams()');
            });
            
            QUnit.test('.timestamp()', function(a){
                a.expect(2);
                a.ok(validate.isFunction(this.fr.timestamp), '.timestamp() exists');
                a.strictEqual(this.fr.timestamp(), this.ts, 'returns expected value');
            });
        }
    );
});

QUnit.module('The Databridge.FetchResponse class', {}, function(){
    QUnit.test('class exists', function(a){
        a.equal(typeof Databridge.FetchResponse, 'function');
    });
    
    // NOTE - not testing dataPromise because that would mean the tests have to be async.
    
    QUnit.module('constructor', {}, function(){
        QUnit.test('required arguments', function(a){
            a.expect(3);
            var db = new Databridge();
            var ds = new Databridge.Datasource('testDS', function(){ return true; });
            var fr = new Databridge.FetchRequest(db, ds, {}, [], moment().toISOString());
            a.throws(
                function(){
                    new Databridge.FetchResponse();
                },
                validateParams.ValidationError,
                'throws error when no arguments are passed'
            );
            a.ok(new Databridge.FetchResponse(fr), 'no error thrown with all required params');
            a.ok(new Databridge.FetchResponse(fr, {}), 'no error thrown with required params and optional meta');
        });
        
        QUnit.test('data correctly stored', function(a){
            a.expect(2);
            var db = new Databridge();
            var ds = new Databridge.Datasource('testDS', function(){ return true; });
            var freq = new Databridge.FetchRequest(db, ds, {}, [], moment().toISOString());
            var m = {};
            var fres = new Databridge.FetchResponse(freq, m);
            a.strictEqual(fres._request, freq, 'request successfully stored');
            a.strictEqual(fres._meta, m, 'meta data successfully stored');
        });
    });

    QUnit.module(
        'accessors',
        {
            beforeEach: function(){
                this.db = new Databridge;
                this.ds = new Databridge.Datasource('test', function(){ return true; });
                this.freq = new Databridge.FetchRequest(this.db, this.ds, {}, [], moment().toISOString());
                this.m = { a: 'b' };
                this.fres = new Databridge.FetchResponse(this.freq, this.m);
            }
        },
        function(){
            QUnit.test('.request()', function(a){
                a.expect(2);
                a.ok(validate.isFunction(this.fres.request), '.request() exists');
                a.strictEqual(this.fres.request(), this.freq, 'returns expected value');
            });
            
            QUnit.test('.dataPromise() R/W', function(a){
                a.expect(2);
                a.ok(validate.isFunction(this.fres.dataPromise), '.dataPromise() exists');
                a.throws(
                    function(){
                        this.fres.dataPromise('thingy');
                    },
                    TypeError,
                    'throws an error when a non-promise is passed as an argument'
                );
            });
            
            QUnit.test('.meta() R/W', function(a){
                a.expect(5);
                a.ok(validate.isFunction(this.fres.meta), '.meta() exists');
                a.throws(
                    function(){
                        this.fres.meta();
                    },
                    validateParams.ValidationError,
                    'throws an error when called without args'
                );
                a.throws(
                    function(){
                        this.fres.meta(new Date());
                    },
                    validateParams.ValidationError,
                    'throws an error when called non-string first arg'
                );
                a.strictEqual(this.fres.meta('a'), 'b', 'returns expected value');
                a.strictEqual(this.fres.meta('a', 'c'), 'c', 'sets and returns expected value in setter mode');
            });
            
            QUnit.test('.allMeta()', function(a){
                a.expect(3);
                a.ok(validate.isFunction(this.fres.allMeta), '.allMeta() exists');
                a.deepEqual(this.fres.allMeta(), this.m, 'returns expected value');
                a.notStrictEqual(this.fres.allMeta(), this.m, 'returns shallow copy not reference');
            });
        }
    );
});