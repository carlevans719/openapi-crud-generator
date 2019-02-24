# openapi-crud-generator

Only supported flag currently is `--print-template` which will print the built-in template to the console and exit.

### installation

```shell
npm i -g openapi-crud-generator
```

### usage

```shell
openapi-crud-generator [--print-template]
```

If there is a file in the directory that you run this command in called `template.json`, the tool will use this instead of the built-in one. You can use the `--print-template` option to get a copy of the built-in template which you can then tweak and save as `template.json` to use custom base templates. Check `lib/buildTemplate.js` to see what properties are overridden / set by this tool.

### files

- `cli.js` is the main CLI entrypoint
- `lib/makeCrud.js` is responsible for collecting data from the user
- `lib/buildTemplate.js` is responsible for augmenting the built-in template with data collected from the user
