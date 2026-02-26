import { describe, it, expect } from 'vitest';
import { MultimediaConfig } from '../../../../src/multimedia/utils/multimedia-config.js';

describe('MultimediaConfig', () => {
  it('defaults to empty params', () => {
    const config = new MultimediaConfig();
    expect(config.params).toEqual({});
  });

  it('merges override params', () => {
    const config = new MultimediaConfig({ foo: 'bar' });
    const override = new MultimediaConfig({ baz: 2 });
    config.mergeWith(override);
    expect(config.params).toEqual({ foo: 'bar', baz: 2 });
  });

  it('fromDict/toDict round trips', () => {
    const config = MultimediaConfig.fromDict({ hello: 'world' });
    expect(config.params).toEqual({ hello: 'world' });
    expect(config.toDict()).toEqual({ hello: 'world' });
  });

  it('mergeWith ignores empty override', () => {
    const config = new MultimediaConfig({ foo: 'bar' });
    config.mergeWith(null);
    config.mergeWith(new MultimediaConfig());
    expect(config.params).toEqual({ foo: 'bar' });
  });
});
