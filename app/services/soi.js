'use strict';

var odb = require('../../components/orientdb.js');
var _ = require('underscore');
var util = require('../../components/utilities.js');
var strUtil = require('util');

var schemaTypeMap = [
	{dbtype: 7, apptype: 'string'},
	{dbtype: 1, apptype: 'integer'},
	{dbtype: 19, apptype: 'date'}
];

exports.getEdge = function(edgeObjectType, edgeRecordItemId, callback) {
var query = strUtil.format("SELECT FROM %s where @rid = %s", edgeObjectType, edgeRecordItemId);
	console.log(query);	

	odb.db.query(query).then(function(records){
		console.log('***************');
		console.dir(records);
		console.log('***************');

		var recs=[];
		for(var i=0; i<records.length; i++) {
			var rec = records[i];
			var recId = rec['@rid'];
			console.log(recId.position);
			rec.id = '#'+	recId.cluster + ':' + recId.position;
			recs.push(rec);
		}
		callback(null,records[0]);
	});
}

exports.deleteEdge = function(recordId, callback) {
	odb.db.record.delete(recordId);
	callback(null, true);
}

exports.updateEdge = function(objectType, recordData, sourceId, targetId, callback) {

	var cleanData = {};
	for(var propertyName in recordData) {
		if(recordData[propertyName] != null && propertyName.indexOf('in') == -1 && propertyName.indexOf('out') == -1 && propertyName.indexOf('@') == -1 && propertyName != 'id' && propertyName != 'backup' && typeof propertyName != 'object' && typeof propertyName != 'array')
			cleanData[propertyName] = recordData[propertyName];
	}
	console.dir(cleanData);
	console.log('*******************');
	var sendObj = util.prepareInboudDate(cleanData);
	console.dir(sendObj);

	var ret = odb.db.record.delete(recordData.id);
	console.log(ret);
	if(ret != null) {
		var playsFor = odb.db.create('EDGE', objectType)
	   	.from(sourceId).to(targetId).set(sendObj).one();		
	  callback(null, playsFor);
	} else {
		callback(500, null);	
	}
	
}

exports.addEdge = function(objectType, recordData, sourceId, targetId, callback) {

	var cleanData = {};
	for(var propertyName in recordData) {
		if(recordData[propertyName] != null)
			cleanData[propertyName] = recordData[propertyName];
	}
	console.dir(cleanData);
	console.log('*******************');
	var sendObj = util.prepareInboudDate(cleanData);
	console.dir(sendObj);

	var playsFor = odb.db.create('EDGE', objectType)
   	.from(sourceId).to(targetId).set(sendObj).one();
   callback(null, true);
}

exports.fetchRecords = function(objectType, callback) {
	var query = strUtil.format("SELECT FROM %s", objectType);
	console.log(query);	

	odb.db.query(query).then(function(records){
		console.log('***************');
		console.dir(records);
		console.log('***************');

		var recs=[];
		for(var i=0; i<records.length; i++) {
			var rec = records[i];
			var recId = rec['@rid'];
			console.log(recId.position);
			rec.id = '#'+	recId.cluster + ':' + recId.position;
			recs.push(rec);
		}
		callback(null,records);
	});
}

exports.getRecordDetails = function(objectType, recordId, callback) {
	//var panelRecord={};
	//panelRecord.id = '#13:1';

	odb.db.query("traverse * from " + recordId).then(function(recordDetails){
   console.dir(recordDetails)

   var returnObj = {};
   for(var i=0; i<recordDetails.length; i++) {
			var obj = recordDetails[i];
			var className = obj['@class'];
			console.log(obj['@class']);

			if(!util.defined(returnObj,className)) {
				returnObj[className]=[];
			}

			var props={};
			for(var propertyName in obj) {
				// console.log('propertyName: ' + propertyName);
				// console.log('propertyValue: ' + obj[propertyName]);
				console.log('typeof propertyName: ' + typeof propertyName);

				if(propertyName.indexOf('in') == -1 && propertyName.indexOf('out') == -1 && propertyName.indexOf('@') == -1 && propertyName != 'id' && propertyName != 'backup' && typeof propertyName != 'object' && typeof propertyName != 'array') {
					props[propertyName] = obj[propertyName];
					console.log('*add:' + propertyName);
				} else if(propertyName.indexOf('@rid') > -1) {
					console.log('*Id:' );
					var idobj = obj[propertyName];
					console.dir(idobj.cluster + ':' + idobj.position);
					props.id = '#' + idobj.cluster + ':' + idobj.position;
				} else if(propertyName.indexOf('in') > -1 && propertyName.indexOf('_') == -1) {
					var inobj = obj[propertyName];
					console.log('*****IN:' );
					console.dir(inobj);

					var inprops={};
					for(var propertyName in inobj) {
						if(propertyName.indexOf('in') == -1 && propertyName.indexOf('out') == -1 && propertyName.indexOf('@') == -1 && propertyName != 'id' && propertyName != 'backup' && typeof propertyName != 'object' && typeof propertyName != 'array') {
							props[propertyName] = inobj[propertyName];
							console.log('*add:' + propertyName);
						} else if(propertyName.indexOf('@rid') > -1) {
							console.log('*Id:' );
							var idobj = inobj[propertyName];
							console.dir(idobj.cluster + ':' + idobj.position);
							props.inId = '#' + idobj.cluster + ':' + idobj.position;
						}
					}

				}
			}
			returnObj[className].push(props);
			console.log('returnObj: ');
			console.dir(returnObj);
   }
   callback(null,returnObj);
	});
}

exports.addRecord = function(objectType, panelRecord, callback) {
	var updateObj = {};
	for(var propertyName in panelRecord) {
		if(propertyName.indexOf('@') == -1 && propertyName != 'id' && propertyName != 'backup') {
			updateObj[propertyName] = panelRecord[propertyName];
		}
	}
	var sendObj = util.prepareInboudDate(updateObj);
	console.dir(sendObj);

	odb.db.insert().into(objectType)
   .set(sendObj).all().then(function(returnObj){
      console.log(returnObj);
      callback(null, returnObj);
   });
}


exports.updateRecord = function(objectType, panelRecord, callback) {
	var updateObj = {};
	var rid = panelRecord['@rid'];
	for(var propertyName in panelRecord) {
		if(propertyName.indexOf('@') == -1 && propertyName != 'id' && propertyName != 'backup') {
			updateObj[propertyName] = panelRecord[propertyName];
		}
	}
	var sendObj = util.prepareInboudDate(updateObj);
	console.dir(sendObj);

	console.log('Update:');
	console.dir(sendObj);

	odb.db.update(panelRecord.id)
   .set(sendObj).one()
   .then(
      function(update){
         console.log('Records Updated:', update);
         callback(null, update);
      }
   );	
}

exports.deleteRecord = function(objectType, panelRecord, callback) {
	odb.db.record.delete(panelRecord.id);
	callback(null, true);
}


exports.getRecords = function(objName, callback) {

	console.log('getRecords');

	// var fieldString = '';
	// for(var i=0; i<fields.length; i++) {
	// 	var field=fields[i];
	// 	if(i == fields.length-1) {
	// 		fieldString += field.schemaName;
	// 	} else {
	// 		fieldString += field.schemaName + ', ';
	// 	}
	// }
	// console.log(fieldString);

	var query = strUtil.format("SELECT FROM %s", objName);
	console.log(query);	

	odb.db.query(query).then(function(records){
		console.log('***************');
		console.dir(records);
		console.log('***************');

		var recs=[];
		for(var i=0; i<records.length; i++) {
			var rec = records[i];
			var recId = rec['@rid'];
			console.log(recId.position);
			rec.id = '#'+	recId.cluster + ':' + recId.position;
			recs.push(rec);
		}
		callback(null,records);
	});
}

exports.getSchema = function(objName, callback) {

	odb.db.class.get(objName).then(function(obj){
	   obj.property.list()
	   .then(
	      function(properties){
	        console.log('properties');
	        console.dir(properties);

	        var props={};
	        for(var i=0; i<properties.length; i++) {
	        	var prop = properties[i];
	        	console.log('prop:' + prop);

	        	var appType = '';
	        	var fnd = _.findWhere(schemaTypeMap, {dbtype: prop.type})
	        	if(util.defined(fnd)) {
	        		console.log('type:' + fnd);
	        		appType = fnd.apptype;
	        	}

	        	var obj = {
	        		type: appType,
	        		mandatory: prop.mandatory,
	        		defaultValue: prop.defaultValue,
	        		readOnly: prop.readonly,
	        		notNull: prop.notNull,
	        		min: prop.min,
	        		max: prop.max,
	        		cluster: prop['class'].defaultClusterId
	        	}
	        	props[prop.name] = obj;
	        }
		      callback(null,props);        
	      }
	    );
	});
}