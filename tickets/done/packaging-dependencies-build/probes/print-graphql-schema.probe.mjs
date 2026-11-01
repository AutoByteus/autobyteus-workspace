import 'reflect-metadata';
import { printSchema } from 'graphql';
const { buildGraphqlSchema } = await import(process.argv[2] + '/dist/api/graphql/schema.js');
const schema = await buildGraphqlSchema();
process.stdout.write(printSchema(schema));
