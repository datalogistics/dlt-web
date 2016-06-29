// Just a temporary way -- Will eventaully remove this 
window.exnodeScheme = {
    "$schema": "http://json-schema.org/draft-04/hyper-schema#",
    "id": "http://unis.incntre.iu.edu/schema/exnode/3/exnode#",
    "description": "Schema for describing an base eXnode",
    "name": "eXnode",
    "type": "object",
    "additionalProperties": true,
    "required": ["id", "created", "modified", "name", "size", "parent", "mode"],
    "properties": {
        "$schema": {
            "default": "http://unis.incntre.iu.edu/schema/exnode/3/exnode#",
            "description": "The schema of this file",
            "format": "uri",
            "type": "string"
        },
        "id": {
            "description": "A unique exnode identifier",
            "minLength": 1,
            "type": "string"
        },
        "selfRef": {
            "description": "Self hyperlink reference for the exnode",
            "format": "uri",
            "type": "string"
        },
        "mode": {
            "enum": ["file", "directory"],
            "description": "An exnode can represent either a file or a directory"
        },
        "created": {
            "type": "integer",
            "description": "64-bit Integer timestamp of the exnode creation date"
        },
        "modified": {
            "type": "integer",
            "description": "64-bit Integer timestamp of the last modified date"
        },
        "urn": {
            "type": "string",
            "format": "uri"
        },
        "name": {
            "description": "The name of an exnode (EK): probably need a schema for valid names",
            "type": "string"
        },
        "size": {
            "description": "The size of an exnode in bytes",
            "type": "integer"
        },
        "description": {
            "description": "Exnode description",
            "type": "string"
        },
        "status": {
            "description": "Status of an exnode (EK): might be useful, could formalize",
            "type": "string",
            "default": "UNKNOWN"
        },
        "parent": {
            "description": "A pointer to a parent exnode, null if adrift",
            "anyOf": [{
                "$ref": "http://unis.incntre.iu.edu/schema/exnode/3/exnode#"
            }, {
                "$ref": "http://json-schema.org/draft-04/links#"
            }, {
                "type": "null"
            }]
        },
        "properties": {
            "description": "Additional properties.",
            "type": "object",
            "additionalProperties": true
        }
    },
    "links": [{
        "rel": "describedby",
        "href": "{$schema}"
    }, {
        "rel": "self",
        "href": "{id}"
    }, {
        "rel": "destroy",
        "href": "{id}",
        "method": "DELETE"
    }, {
        "rel": "create",
        "href": "resources",
        "method": "POST"
    }, {
        "rel": "update",
        "href": "{id}",
        "method": "PUT"
    }]
};

window.extentSchema = {
    "$schema": "http://json-schema.org/draft-04/hyper-schema#",
    "id": "http://unis.incntre.iu.edu/schema/exnode/3/extent#",
    "description": "An extent is some chunk of data, somewhere",
    "name": "extent",
    "type": "object",
    "required": ["location",
        "size",
        "offset"
    ],
    "properties": {
        "location": {
            "description": "Where the extent resides as a URI",
            "type": "string",
            "format": "uri"
        },
        "size": {
            "description": "The size of an extent",
            "type": "integer"
        },
        "offset": {
            "description": "Offset of this chunk in overall file",
            "type": "integer"
        },
        "index": {
            "description": "Relative index of an extent",
            "type": "integer"
        }
    }
};

window.exnodeForm = [
  {
    type: "section",
    htmlClass: "col-md-4",
    items: [{
      key: "description",
      htmlClass: "kkkkk"
    }]
  },{
    type: "submit",
    title: "Search"
}];

window.dltSchema = {
  // start_date : 'date' ,
  // end_date:'date',
  // // aoi_entry
  // aoi_entry : "path_row",
  // seasonal : [true , false],
  // cloud_cover : 0 // 0 to 100 

  // name : "dltForm" ,
  
};


