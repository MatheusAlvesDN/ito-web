// Client-side translation caller that runs entirely in the browser
export const translateText = async (
  text: string,
  from: string,
  to: string,
  signal?: AbortSignal
): Promise<string> => {
  let response: Response;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    response = await fetch(url, { signal });
  } catch (err) {
    // Cancelamento (AbortController) é propagado como está para não ser exibido como erro
    if ((err as { name?: string } | null)?.name === 'AbortError') throw err;
    throw new Error('Erro na tradução: falha de conexão com o Google Translate');
  }

  if (!response.ok) {
    throw new Error(`Erro na tradução (HTTP ${response.status})`);
  }

  const data = await response.json();
  return (data[0] as [string, ...unknown[]][]).map((x) => x[0]).join('');
};
