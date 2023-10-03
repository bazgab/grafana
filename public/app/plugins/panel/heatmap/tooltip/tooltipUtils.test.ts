import { formatMilliseconds } from './utils';

describe('format milliseconds', () => {
  it('converts ms to appropriate unit', async () => {
    let msToFormat = 10;
    let formatted = formatMilliseconds(msToFormat);
    expect(formatted).toBe('10 milliseconds');

    msToFormat = 1000;
    formatted = formatMilliseconds(msToFormat);
    expect(formatted).toBe('1 second');

    msToFormat = 1000 * 120;
    formatted = formatMilliseconds(msToFormat);
    expect(formatted).toBe('2 minutes');

    msToFormat = 1000 * 60 * 60;
    formatted = formatMilliseconds(msToFormat);
    expect(formatted).toBe('1 hour');

    msToFormat = 1000 * 60 * 60 * 24;
    formatted = formatMilliseconds(msToFormat);
    expect(formatted).toBe('1 day');

    msToFormat = 1000 * 60 * 60 * 24 * 7 * 3;
    formatted = formatMilliseconds(msToFormat);
    expect(formatted).toBe('3 weeks');

    msToFormat = 1000 * 60 * 60 * 24 * 7 * 4;
    formatted = formatMilliseconds(msToFormat);
    expect(formatted).toBe('4 weeks');

    msToFormat = 1000 * 60 * 60 * 24 * 7 * 5;
    formatted = formatMilliseconds(msToFormat);
    expect(formatted).toBe('1 month');

    msToFormat = 1000 * 60 * 60 * 24 * 365;
    formatted = formatMilliseconds(msToFormat);
    expect(formatted).toBe('1 year');

    msToFormat = 1000 * 60 * 60 * 24 * 365 * 2;
    formatted = formatMilliseconds(msToFormat);
    expect(formatted).toBe('2 years');
  });
});
