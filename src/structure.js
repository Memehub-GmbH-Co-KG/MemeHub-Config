module.exports = {
    // RRB Config
    rrb: {
        channels: {
            logging: { _type: "string", default: "logging:log" },
            meme: {
                edited: { _type: "string", default: "events:edit" },
            },
            categories: {
                created: { _type: "string", default: "events:category-created" },
                deleted: { _type: "string", default: "events:category-deleted" },
                mappingCreated: { _type: "string", default: "events:category-mapping-created" },
                mappingDeleted: { _type: "string", default: "events:category-mapping-deleted" },
                maximumChanged: { _type: "string", default: "events:category-maximum-changed" },
                columnsChanged: { _type: "string", default: "events:category-columns-changed" },
            }
        },
        queues: {
            categories: {
                create: { _type: "string", default: "categories:create" },
                delete: { _type: "string", default: "categories:delete" },
                list: { _type: "string", default: "categories:list" },
                createMapping: { _type: "string", default: "categories:create-mapping" },
                deleteMapping: { _type: "string", default: "categories:delete-mapping" },
                mappings: { _type: "string", default: "categories:mappings" },
                get: { _type: "string", default: "categories:get" },
                set: { _type: "string", default: "categories:set" },
                add: { _type: "string", default: "categories:add" },
                remove: { _type: "string", default: "categories:remove" },
                validate: { _type: "string", default: "categories:validate" },
                getOrSetMaximum: { _type: "string", default: "categories:maximum" },
                getOrSetColumns: { _type: "string", default: "categories:columns" }
            }
        }
    },
    // MongoDB
    mongodb: {
        connection: { _type: "string", default: "localhost" },
        database: { _type: "string", default: "development" },
        collections: {
            memes: { _type: "string", default: "memes" }
        }
    },
    // Bot config
    state: {
        categories: {
            active: { _type: "set", default: [] },
            mappings: { _type: "hash", default: {} },
            maximum: { _type: "number", default: 5 },
            columns: { _type: "number", default: 5 }
        }
    },
};
