import { describe, it, expect } from 'vitest';
import { ParsingStreamingResponseHandler } from '../../../../src/agent/streaming/handlers/parsing-streaming-response-handler.js';
import { SegmentEventType, SegmentType } from '../../../../src/agent/streaming/segments/segment-events.js';
import { ChunkResponse } from '../../../../src/llm/utils/response-types.js';

const asChunk = (content: string) => new ChunkResponse({ content });

const feedAndFinalize = (handler: ParsingStreamingResponseHandler, chunks: string[]) => {
  for (const chunk of chunks) {
    handler.feed(asChunk(chunk));
  }
  handler.finalize();
};

describe('Full streaming flow (integration)', () => {
  it('handles a complete response with tool calls', () => {
    const collectedEvents: any[] = [];
    const collectedInvocations: any[] = [];

    const handler = new ParsingStreamingResponseHandler({
      onSegmentEvent: (event) => collectedEvents.push(event),
      onToolInvocation: (invocation) => collectedInvocations.push(invocation)
    });

    feedAndFinalize(handler, [
      "I'll read the file for you.\n\n",
      '<tool name="read_file">',
      '<path>/src/main.py</path>',
      '</tool>',
      "\n\nHere's what I found."
    ]);

    expect(collectedEvents.length).toBeGreaterThan(0);
    expect(collectedInvocations).toHaveLength(1);
    const invocation = collectedInvocations[0];
    expect(invocation.name).toBe('read_file');
    expect(invocation.arguments).toEqual({ path: '/src/main.py' });

    const toolStarts = collectedEvents.filter(
      (event) => event.segment_type === SegmentType.TOOL_CALL && event.event_type === SegmentEventType.START
    );
    expect(toolStarts).toHaveLength(1);
    expect(toolStarts[0].segment_id).toBe(invocation.id);
  });

  it('creates unique IDs for multiple tool calls', () => {
    const handler = new ParsingStreamingResponseHandler();
    handler.feed(
      asChunk(`
First I'll read file A:
<tool name="read_file"><path>/a.py</path></tool>

Now I'll read file B:
<tool name="read_file"><path>/b.py</path></tool>

Done!
`)
    );
    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(2);
    expect(invocations[0].arguments.path).toBe('/a.py');
    expect(invocations[1].arguments.path).toBe('/b.py');
    expect(invocations[0].id).not.toBe(invocations[1].id);
  });

  it('keeps segment IDs stable for approval flow', () => {
    const eventsById = new Map<string, any[]>();
    const handler = new ParsingStreamingResponseHandler({
      onSegmentEvent: (event) => {
        const list = eventsById.get(event.segment_id) ?? [];
        list.push(event);
        eventsById.set(event.segment_id, list);
      }
    });

    handler.feed(
      asChunk(
        '<tool name="write_file"><arg name="path">/out.txt</arg><arg name="content">Hello</arg></tool>'
      )
    );
    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(1);
    const invocation = invocations[0];

    const events = eventsById.get(invocation.id) ?? [];
    const types = events.map((event) => event.event_type);
    expect(types).toContain(SegmentEventType.START);
    expect(types).toContain(SegmentEventType.END);
  });

  it('handles mixed content types', () => {
    const handler = new ParsingStreamingResponseHandler();
    handler.feed(
      asChunk(`
Let me help you:

<write_file path="/output.py">
def hello():
    print("hello")
</write_file>

<run_bash>
python output.py
</run_bash>

<tool name="verify_result"><expected>hello</expected></tool>

All done!
`)
    );
    handler.finalize();

    const events = handler.getAllEvents();
    const invocations = handler.getAllInvocations();
    const segmentTypes = events.map((event) => event.segment_type).filter(Boolean);

    expect(segmentTypes).toContain(SegmentType.TEXT);
    expect(segmentTypes).toContain(SegmentType.WRITE_FILE);
    expect(segmentTypes).toContain(SegmentType.RUN_BASH);
    expect(segmentTypes).toContain(SegmentType.TOOL_CALL);

    const names = invocations.map((invocation) => invocation.name);
    expect(names).toContain('write_file');
    expect(names).toContain('run_bash');
    expect(names).toContain('verify_result');
  });

  it('preserves raw HTML in write_file shorthand', () => {
    const handler = new ParsingStreamingResponseHandler();
    handler.feed(asChunk(`<write_file path="/site/index.html">
<!doctype html>
<html>
  <body>
    <!-- hero -->
    <div class="hero">& welcome</div>
  </body>
</html>
</write_file>`));
    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('write_file');
    expect(invocations[0].arguments.path).toBe('/site/index.html');
    const content = invocations[0].arguments.content as string;
    expect(content).toContain('<!-- hero -->');
    expect(content).toContain('<div class="hero">& welcome</div>');
  });

  it('supports CDATA content in XML tool calls', () => {
    const handler = new ParsingStreamingResponseHandler();
    handler.feed(asChunk(
      '<tool name="write_file">' +
        '<arg name="path">/site/app.js</arg>' +
        '<arg name="content"><![CDATA[' +
        "const html = '<div class=\"app\">& ready</div>'\n" +
        '// ok' +
        ']]></arg>' +
        '</tool>'
    ));
    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('write_file');
    expect(invocations[0].arguments.path).toBe('/site/app.js');
    const content = invocations[0].arguments.content as string;
    expect(content).toContain('<div class="app">& ready</div>');
    expect(content).toContain('// ok');
  });

  it('parses unescaped < in tool arguments', () => {
    const handler = new ParsingStreamingResponseHandler();
    handler.feed(asChunk(
      '<tool name="create_tasks">' +
        '<arg name="description">Handle n <= 0 case</arg>' +
        '</tool>'
    ));
    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('create_tasks');
    expect(invocations[0].arguments).toEqual({ description: 'Handle n <= 0 case' });
  });

  it('preserves nested XML content in write_file', () => {
    const handler = new ParsingStreamingResponseHandler();
    const nestedXmlContent = `<root>
    <child attr="val">
        <grandchild>Content with <br/> tags</grandchild>
    </child>
    <other>
        <item>1</item>
        <item>2</item>
    </other>
</root>`;

    handler.feed(asChunk(`<write_file path="/output.xml">${nestedXmlContent}</write_file>`));
    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('write_file');
    expect(invocations[0].arguments.path).toBe('/output.xml');
    expect(invocations[0].arguments.content).toBe(nestedXmlContent);
  });

  it('handles tool tags split across chunks', () => {
    const handler = new ParsingStreamingResponseHandler();
    feedAndFinalize(handler, ['<tool name="te', 'st"><arg>val', 'ue</arg></to', 'ol>']);

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('test');
    expect(invocations[0].arguments).toEqual({ arg: 'value' });
  });

  it('handles single-character chunks', () => {
    const handler = new ParsingStreamingResponseHandler();
    const content = '<tool name="x"><a>1</a></tool>';
    for (const char of content) {
      handler.feed(asChunk(char));
    }
    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('x');
  });

  it('handles chunked tool calls with unescaped <', () => {
    const handler = new ParsingStreamingResponseHandler();
    feedAndFinalize(handler, [
      '<tool name="create_tasks"><arg name="description">Handle n <',
      '= 0 case</arg></tool>'
    ]);

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(1);
    expect(invocations[0].arguments).toEqual({ description: 'Handle n <= 0 case' });
  });

  it('handles sentinel tool calls in a single chunk', () => {
    const handler = new ParsingStreamingResponseHandler({ parserName: 'sentinel' });
    handler.feed(asChunk(
      '[[SEG_START {"type":"tool","tool_name":"create_tasks","arguments":' +
        '{"tasks":[{"task_name":"implement_fibonacci","description":"Handle n <= 0 case"}]}}]]' +
        '[[SEG_END]]'
    ));
    handler.finalize();

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(1);
    expect(invocations[0].name).toBe('create_tasks');
    expect(invocations[0].arguments.tasks).toEqual([
      { task_name: 'implement_fibonacci', description: 'Handle n <= 0 case' }
    ]);
  });

  it('handles chunked sentinel tool calls', () => {
    const handler = new ParsingStreamingResponseHandler({ parserName: 'sentinel' });
    feedAndFinalize(handler, [
      '[[SEG_START {"type":"tool","tool_name":"create_tasks","arguments":',
      '{"tasks":[{"description":"Handle n <',
      '= 0 case"}]}}]]',
      '[[SEG_END]]'
    ]);

    const invocations = handler.getAllInvocations();
    expect(invocations).toHaveLength(1);
    expect(invocations[0].arguments.tasks).toEqual([{ description: 'Handle n <= 0 case' }]);
  });
});
