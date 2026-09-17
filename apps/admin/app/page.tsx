import { getProductsWithContent } from "@ninecrate/data-store";

export const dynamic = "force-dynamic";

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default async function DashboardPage() {
  const products = await getProductsWithContent();

  return (
    <main className="page">
      <h1>Ninecrate Import Dashboard</h1>
      <p className="subtitle">
        {products.length} product{products.length === 1 ? "" : "s"} imported
      </p>

      {products.length === 0 ? (
        <p className="empty">
          No products yet. Run <code>pnpm run import:scrape &lt;url&gt;</code> to import one.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Title</th>
              <th>Price</th>
              <th>TikTok content</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.sourceId}>
                <td>
                  {p.images[0] && isSafeHttpUrl(p.images[0]) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt={p.title} className="thumb" />
                  ) : (
                    <div className="thumb thumb--empty" />
                  )}
                </td>
                <td>
                  {isSafeHttpUrl(p.sourceUrl) ? (
                    <a href={p.sourceUrl} target="_blank" rel="noreferrer">
                      {p.title}
                    </a>
                  ) : (
                    p.title
                  )}
                </td>
                <td>
                  {p.price.toFixed(2)} {p.currency}
                </td>
                <td>
                  {p.tiktok ? (
                    <div className="tiktok">
                      <strong>{p.tiktok.hook}</strong>
                      <p>{p.tiktok.caption}</p>
                      <div className="hashtags">
                        {p.tiktok.hashtags.map((h) => (
                          <span key={h}>#{h}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="pending">
                      Not generated — run <code>pnpm run tiktok:generate</code>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
