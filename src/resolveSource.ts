export type ResolveDeps = {
  readFile: (p: string) => Promise<string>;
  readStdin: () => Promise<string>;
  isStdinTty: boolean;
  pickFile: () => Promise<string>;
  existsSync: (p: string) => boolean;
  cwd: string;
};

export type ResolvedSource = { path: string | null; content: string };

export async function resolveSource(
  args: { path?: string },
  deps: ResolveDeps
): Promise<ResolvedSource> {
  if (args.path === '-') return { path: null, content: await deps.readStdin() };
  if (args.path) return { path: args.path, content: await deps.readFile(args.path) };
  if (!deps.isStdinTty) return { path: null, content: await deps.readStdin() };
  const picked = await deps.pickFile();
  return { path: picked, content: await deps.readFile(picked) };
}
