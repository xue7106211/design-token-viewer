export function shouldLoadRemoteDocument({
  hasData,
  isLoading,
  error,
}: {
  hasData: boolean;
  isLoading: boolean;
  error: string | null;
}) {
  return !hasData && !isLoading && error == null;
}
