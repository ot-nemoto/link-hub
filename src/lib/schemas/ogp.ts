import { z } from "zod";

import { httpUrlField } from "./common";

/** OGP 取得エンドポイントの `url` クエリスキーマ（http/https 必須）。 */
export const ogpQuerySchema = z.object({ url: httpUrlField });
