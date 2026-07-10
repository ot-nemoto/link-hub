import { z } from "zod";

import { httpUrlField } from "./common";

/** OGP 取得エンドポイントの `url` クエリスキーマ（http/https 必須）。 */
export const ogpQuerySchema = z.object({ url: httpUrlField });

/** OGP 取得のレスポンス形式（取得できなければ null）。 */
export const ogpResponseSchema = z.object({
  title: z.string().nullable(),
  image: z.string().nullable(),
});
