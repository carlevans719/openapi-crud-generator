const templ = (() => {
  const fs = require('fs')
  const path = require('path')

  if (fs.existsSync(path.join(process.cwd(), 'template.json'))) {
    try {
      const override = require(path.join(process.cwd(), 'template.json'))
      console.log('Using template: ' + path.join(process.cwd(), 'template.json'))
      return override
    } catch (ex) {
      console.error(ex.message)
    }
  }

  console.log('Using default template')
  return require('./templ.json')
})()

function dedent (strings, ...values) {
  let fullString = strings.reduce(
    (accumulator, str, i) => `${accumulator}${values[i - 1]}${str}`);

  // match all leading spaces/tabs at the start of each line
  const match = fullString.match(/^[ \t]*(?=\S)/gm);
  if (match === null) {
    // e.g. if the string is empty or all whitespace.
    return fullString;
  }

  // find the smallest indent, we don't want to remove all leading whitespace
  const indent = Math.min(...match.map((el) => el.length));
  const regexp = new RegExp(`^[ \\t]{${indent}}`, 'gm');
  fullString = indent > 0 ? fullString.replace(regexp, '') : fullString;
  return fullString;
}

function getParams () {
  return {
    body (description, schema) {
      return {
        name: 'body',
        in: 'body',
        description,
        required: true,
        schema
      }
    },
    sortBy: {
      name: 'sort_by',
      in: 'query',
      description: 'The sort key',
      required: false,
      type: 'string'
    },
    sortOrder: {
      name: 'sort_order',
      in: 'query',
      description: 'The sort order',
      required: false,
      type: 'string',
      enum: [
        'asc',
        'desc'
      ],
    },
    skip: {
      name: 'skip',
      in: 'query',
      description: 'The number of documents to skip',
      required: false,
      type: 'integer'
    },
    limit: {
      name: 'limit',
      in: 'query',
      description: 'The maximum number of documents to return',
      required: false,
      type: 'integer'
    },
    id: {
      name: 'id',
      in: 'path',
      description: 'The ID',
      required: true,
      type: 'string',
      format: 'uuid'
    }
  }
}

function getResponses (modelName) {
  return {
    singular200 (description) {
      return {
        description,
        schema: {
          allOf: [
            { $ref: '#/definitions/200' },
            {
              type: 'object',
              properties: {
                data: { $ref: `#/definitions/${modelName}` }
              }
            }
          ]
        }
      }
    },
    204: {
      description: 'No Content',
      schema: { $ref: '#/definitions/204' }
    },
    400: {
      description: 'Bad Request',
      schema: { $ref: '#/definitions/400' }
    },
    401: {
      description: 'Unauthorized',
      schema: { $ref: '#/definitions/401' }
    },
    403: {
      description: 'Forbidden',
      schema: { $ref: '#/definitions/403' }
    },
    404: {
      description: `${modelName} Not Found`,
      schema: { $ref: '#/definitions/404' }
    },
    409: {
      description: 'Conflict',
      schema: { $ref: '#/definitions/409' }
    },
    500: {
      description: 'Internal Server Error',
      schema: { $ref: '#/definitions/500' }
    }
  }
}

function getSecurity (pathName) {
  return {
    read: [{
      default: [`${pathName}:read`, `${pathName}:read:all`]
    }],
    write: [{
      default: [`${pathName}:write`, `${pathName}:write:all`]
    }]
  }
}

function getDefinitions (modelName, modelData) {
  // Scaffold model properties
  const props = { base: {}, create: {}, update: {} }
  modelData.forEach(prop => {
    props.base[prop.name] = {
      type: prop.type,
      required: prop.required
    }

    if (prop.creatable) {
      props.create[prop.name] = props.base[prop.name]
    }

    if (prop.updatable) {
      props.update[prop.name] = { type: prop.type }
    }
  })

  return {
    // Base model props
    [`Base${modelName}`]: {
      type: 'object',
      properties: props.base
    },

    // Create model props
    [`New${modelName}`]: {
      type: 'object',
      properties: props.create
    },

    // Update model props
    [`Update${modelName}`]: {
      type: 'object',
      properties: props.update
    },

    // Actual, in-db model
    [modelName]: {
      allOf: [
        { type: 'object', properties: {}, name: modelName, title: modelName },
        { $ref: `#/definitions/BaseModel` },
        { $ref: `#/definitions/Base${modelName}` }
      ]
    }
  }
}

module.exports = function buildTemplate ({ pathName, modelName, modelNamePlural, modelNameDash }, modelData) {
  const params = getParams()
  const responses = getResponses(modelName)
  const security = getSecurity(pathName)
  const definitions = getDefinitions(modelName, modelData)

  // Set basic info
  templ.info.title = `${modelNamePlural} API`
  templ.info.description = `This API is used to manage ${modelNamePlural}\n\n### Documentation\n- [Database Schema]()\n- [Workflows]()\n\n`

  // Sec security definition
  templ.securityDefinitions.default.scopes = {
    [`${pathName}:read`]: `Read ${modelNamePlural} that the user has access to`,
    [`${pathName}:write`]: `Write ${modelNamePlural} that the user has access to`,
    [`${pathName}:read:all`]: `Read any ${modelNamePlural}`,
    [`${pathName}:write:all`]: `Write any ${modelNamePlural}`,
  }

  // Set tags
  templ.tags.push({
    name: pathName,
    description: `Endpoints relating to ${modelNamePlural}`
  })

  // Set custom definitions
  templ.definitions = {
    ...templ.definitions,
    ...definitions
  }

  // List and Create endpoints
  templ.paths[`/${pathName}`] = {
    get: {
      operationId: `get${modelNamePlural}`,
      summary: `List ${modelNamePlural}`,
      description: dedent`
        # List ${modelNamePlural}

        Use this endpoint to list all ${modelNamePlural}.

        ### Support:

        ✓ Pagination

        ✗ Filters
      `,
      security: security.read,
      tags: [pathName],
      responses: {
        200: {
          description: `The ${modelNamePlural}`,
          schema: {
            allOf: [
              { $ref: "#/definitions/200" },
              {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: `#/definitions/${modelName}` }
                  }
                }
              }
            ]
          }
        },
        400: responses['400'],
        401: responses['401'],
        403: responses['403'],
        500: responses['500']
      },
      parameters: [params.sortBy, params.sortOrder, params.skip, params.limit]
    },
    post: {
      operationId: `create${modelName}`,
      summary: `Create a ${modelName}`,
      description: dedent`
        # Create ${modelName}

        Use this endpoint to create a new ${modelName}.

        ### Emits:

        - \`${modelNameDash}:created\`
      `,
      security: security.write,
      tags: [pathName],
      responses: {
        200: responses.singular200(`The new ${modelName}`),
        400: responses['400'],
        401: responses['401'],
        403: responses['403'],
        409: responses['409'],
        500: responses['500']
      },
      parameters: [
        params.body(`The ${modelName}' properties`, { $ref: `#/definitions/New${modelName}` })
      ]
    }
  }

  // Get, Delete and Update endpoints
  templ.paths[`/${pathName}/{id}`] = {
    get: {
      operationId: `get${modelName}ById`,
      summary: `Get a ${modelName} by id`,
      description: dedent`
        # Get ${modelName}

        Use this endpoint to get a specific ${modelName} by referencing its id.

        ### Support:

        ✗ Pagination

        ✗ Filters
      `,
      security: security.read,
      tags: [pathName],
      responses: {
        200: responses.singular200(`The ${modelName}`),
        400: responses['400'],
        401: responses['401'],
        403: responses['403'],
        404: responses['404'],
        500: responses['500']
      },
      parameters: [params.id]
    },
    delete: {
      operationId: `remove${modelName}`,
      summary: `Remove a ${modelName}`,
      description: dedent`
        # Delete ${modelName}

        Use this endpoint to delete a specific ${modelName} by referencing its id.

        ### Emits:

        - \`${modelNameDash}:deleted\`
      `,
      security: security.write,
      tags: [pathName],
      responses: {
        204: responses['204'],
        400: responses['400'],
        401: responses['401'],
        403: responses['403'],
        404: responses['404'],
        500: responses['500'],
      },
      parameters: [params.id]
    },
    patch: {
      operationId: `update${modelName}`,
      summary: `Update a ${modelName}`,
      description: dedent`
        # Update ${modelName}

        Use this endpoint to update a specific ${modelName} by referencing its id.

        Uses a syntax based on the [JSON Merge Patch specification](https://tools.ietf.org/html/rfc7386).

        ### Emits:

        - \`${modelNameDash}:updated\`
      `,
      security: security.write,
      tags: [pathName],
      responses: {
        200: responses.singular200(`The updated ${modelName}`),
        400: responses['400'],
        401: responses['401'],
        403: responses['403'],
        404: responses['404'],
        409: responses['409'],
        500: responses['500'],
      },
      parameters: [
        params.id,
        params.body(
          'Map of fields to update',
          { $ref: `#/definitions/Update${modelName}` }
        )
      ]
    }
  }

  return templ
}
