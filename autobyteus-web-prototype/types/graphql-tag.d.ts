declare module 'graphql-tag' {
  import type { DocumentNode } from 'graphql';

  type GqlTemplateTag = (
    literals: TemplateStringsArray,
    ...placeholders: unknown[]
  ) => DocumentNode;

  const gql: GqlTemplateTag;
  export default gql;
  export { gql };
}
