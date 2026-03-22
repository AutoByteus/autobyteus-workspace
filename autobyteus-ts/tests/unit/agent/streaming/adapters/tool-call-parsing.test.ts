import { describe, it, expect } from 'vitest';
import { parseJsonToolCall, parseXmlArguments } from '../../../../../src/agent/streaming/adapters/tool-call-parsing.js';

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
