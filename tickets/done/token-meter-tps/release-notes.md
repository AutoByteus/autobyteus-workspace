# Token Meter: estimated output speed

- The Token tab now shows Output TPS for the selected agent, with its reported
  runtime/model, observation time and a keyboard-accessible explanation.
- The estimate updates between compatible model-call usage reports and includes
  tool/wait time. It is not instantaneous model-inference speed.
- Clear Collecting and Unavailable states avoid invented readings; last-reported
  values keep their identity and timestamp. A first/only report cannot provide
  a rate, and readings are not restored after reload.
- Existing usage, cost and context reporting remain unchanged. English and
  Simplified Chinese are supported, including narrow panels.
