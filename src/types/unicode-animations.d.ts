declare module "unicode-animations" {
  export type UnicodeSpinner = {
    frames: string[];
    interval: number;
  };

  export const spinners: Record<string, UnicodeSpinner>;

  const defaultExport: Record<string, UnicodeSpinner>;
  export default defaultExport;
}
