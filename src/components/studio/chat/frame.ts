/** Frame width per shape, so a Shorts cover isn't as wide as a thumbnail. */
export const frameClass = (ratio: string) =>
  ratio === '9:16'
    ? 'aspect-[9/16] w-full max-w-[min(15rem,100%)]'
    : 'aspect-video w-full max-w-[min(34rem,100%)]';
