export type TerminalInput = {
  env: NodeJS.ProcessEnv;
  stdout: { isTTY: boolean | undefined; columns: number | undefined; rows: number | undefined };
  colorDepth: number;
};

export type Capabilities = {
  isTty: boolean;
  color: boolean;
  colorDepth: number;
  unicode: boolean;
  width: number;
  height: number;
};

export function detectCapabilities(input: TerminalInput): Capabilities {
  const isTty = !!input.stdout.isTTY;
  const noColor = 'NO_COLOR' in input.env;
  const dumb = input.env.TERM === 'dumb';
  const color = isTty && !noColor && !dumb && input.colorDepth >= 4;
  const unicode =
    !dumb &&
    (!!input.env.WT_SESSION ||
      /utf-?8/i.test(input.env.LANG ?? '') ||
      process.platform === 'darwin');
  return {
    isTty,
    color,
    colorDepth: color ? input.colorDepth : 1,
    unicode,
    width: input.stdout.columns ?? 80,
    height: input.stdout.rows ?? 24,
  };
}
