# Schema

## Prisma スキーマ定義

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String     @id @default(cuid())
  clerkId   String     @unique @map("clerk_id")
  email     String     @unique
  name      String?
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")

  bookmarks Bookmark[]

  @@map("users")
}

model Bookmark {
  id        String   @id @default(cuid())
  url       String
  title     String
  memo      String?
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("bookmarks")
}
```

## テーブル定義

### users

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | VARCHAR | PK, DEFAULT cuid() | 内部 ID |
| clerk_id | VARCHAR | UNIQUE, NOT NULL | Clerk ユーザー ID |
| email | VARCHAR | UNIQUE, NOT NULL | メールアドレス |
| name | VARCHAR | NULL | 表示名 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |

### bookmarks

| カラム名 | 型 | 制約 | 説明 |
|----------|-----|------|------|
| id | VARCHAR | PK, DEFAULT cuid() | ブックマーク ID |
| url | VARCHAR | NOT NULL | ブックマーク URL |
| title | VARCHAR | NOT NULL | タイトル（表示名） |
| memo | TEXT | NULL | メモ（自由記述） |
| user_id | VARCHAR | FK → users.id, NOT NULL | 所有ユーザー ID |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |

## インデックス

| テーブル | カラム | 種別 | 目的 |
|---------|--------|------|------|
| users | clerk_id | UNIQUE | Clerk ID による高速ルックアップ |
| users | email | UNIQUE | メールアドレス重複防止 |
| bookmarks | user_id | INDEX | ユーザー別ブックマーク取得の高速化 |

## リレーション

```
User 1 ──── * Bookmark
```

- User が削除されると、関連する Bookmark も CASCADE 削除される
