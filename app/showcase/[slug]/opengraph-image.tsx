import { renderShowcaseImage, showcaseImageSize } from "./showcase-image";

export const alt = "Iron Path public character showcase";
export const size = showcaseImageSize;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return renderShowcaseImage(slug);
}
