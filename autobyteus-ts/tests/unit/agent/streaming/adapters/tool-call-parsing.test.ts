import { describe, it, expect } from 'vitest';
import { parseJsonToolCall, parseXmlArguments } from '../../../../../src/agent/streaming/adapters/tool-call-parsing.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../../../src/utils/parameter-schema.js';

describe('tool-call-parsing', () => {
  it('parses XML arguments with <arguments> wrapper', () => {
    const xml = '<arguments><arg name="path">/tmp/a.txt</arg><arg name="content">hello</arg></arguments>';
    expect(parseXmlArguments(xml)).toEqual({ path: '/tmp/a.txt', content: 'hello' });
  });

  it('parses legacy XML arguments without wrapper', () => {
    const xml = '<path>/tmp/b.txt</path><content>hi</content>';
    expect(parseXmlArguments(xml)).toEqual({ path: '/tmp/b.txt', content: 'hi' });
  });

  it('decodes XML entities in realistic chained command values', () => {
    const xml =
      '<arguments><arg name="command">mkdir -p test_folder &amp;&amp; cd test_folder &amp;&amp; printf &quot;hello&quot; &gt; note.txt &amp;&amp; cat note.txt</arg></arguments>';
    expect(parseXmlArguments(xml)).toEqual({
      command: 'mkdir -p test_folder && cd test_folder && printf "hello" > note.txt && cat note.txt'
    });
  });

  it('keeps plain chained commands unchanged', () => {
    const xml =
      '<arguments><arg name="command">mkdir -p project && cd project && pwd</arg></arguments>';
    expect(parseXmlArguments(xml)).toEqual({
      command: 'mkdir -p project && cd project && pwd'
    });
  });

  it('parses repeated <item> tags as arrays', () => {
    const xml =
      '<arguments><arg name="audio_paths"><item>/tmp/1.wav</item><item>/tmp/2.wav</item><item>/tmp/3.wav</item></arg></arguments>';
    expect(parseXmlArguments(xml)).toEqual({
      audio_paths: ['/tmp/1.wav', '/tmp/2.wav', '/tmp/3.wav']
    });
  });

  it('keeps a single <item> value wrapped as an array', () => {
    const xml =
      '<arguments><arg name="audio_paths"><item>/tmp/1.wav</item></arg></arguments>';
    expect(parseXmlArguments(xml)).toEqual({
      audio_paths: ['/tmp/1.wav']
    });
  });

  it('decodes XML entities inside array items', () => {
    const xml =
      '<arguments><arg name="parts"><item>a &amp; b</item><item>&lt;done&gt;</item></arg></arguments>';
    expect(parseXmlArguments(xml)).toEqual({
      parts: ['a & b', '<done>']
    });
  });

  it('coerces XML arguments using schema-aware array and primitive types', () => {
    const schema = new ParameterSchema([
      new ParameterDefinition({
        name: 'audio_paths',
        type: ParameterType.ARRAY,
        description: 'Audio paths',
        required: true,
        arrayItemSchema: ParameterType.STRING
      }),
      new ParameterDefinition({
        name: 'background',
        type: ParameterType.BOOLEAN,
        description: 'Background mode',
        required: true
      }),
      new ParameterDefinition({
        name: 'timeout_seconds',
        type: ParameterType.INTEGER,
        description: 'Timeout',
        required: true
      })
    ]);

    const xml =
      '<arguments>' +
        '<arg name="audio_paths"><item>/tmp/1.wav</item><item>/tmp/2.wav</item></arg>' +
        '<arg name="background">true</arg>' +
        '<arg name="timeout_seconds">30</arg>' +
      '</arguments>';

    expect(parseXmlArguments(xml, schema)).toEqual({
      audio_paths: ['/tmp/1.wav', '/tmp/2.wav'],
      background: true,
      timeout_seconds: 30
    });
  });

  it('preserves nested XML as raw string when schema expects string', () => {
    const schema = new ParameterSchema([
      new ParameterDefinition({
        name: 'markup',
        type: ParameterType.STRING,
        description: 'Markup content',
        required: true
      })
    ]);

    const xml =
      '<arguments><arg name="markup"><root><item>1</item><item>2</item></root></arg></arguments>';

    expect(parseXmlArguments(xml, schema)).toEqual({
      markup: '<root><item>1</item><item>2</item></root>'
    });
  });

  it('parses JSON tool call with arguments object or string', () => {
    const direct = parseJsonToolCall(JSON.stringify({ name: 'write_file', arguments: { path: 'a', content: 'b' } }));
    expect(direct).toEqual({ name: 'write_file', arguments: { path: 'a', content: 'b' } });

    const stringArgs = parseJsonToolCall(
      JSON.stringify({ name: 'write_file', arguments: JSON.stringify({ path: 'c', content: 'd' }) })
    );
    expect(stringArgs).toEqual({ name: 'write_file', arguments: { path: 'c', content: 'd' } });
  });

  it('returns null for invalid JSON', () => {
    expect(parseJsonToolCall('{bad json}')).toBeNull();
  });
});
