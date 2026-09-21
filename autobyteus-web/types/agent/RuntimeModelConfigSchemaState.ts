export type RuntimeModelConfigSchemaState = Readonly<
  | { status: 'invalid'; message: string | null; reason?: 'model_required' }
  | { status: 'loading' | 'ready' | 'unavailable'; message: string | null; reason?: never }
>
