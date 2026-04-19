import clipboardy from 'clipboardy';

export async function copyToClipboard(text: string): Promise<void> {
  await clipboardy.write(text);
}
