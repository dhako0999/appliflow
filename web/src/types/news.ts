export type Article = {
    uuid: string;
    title: string;
    description: string | null;
    snippet: string | null;
    url: string | null;
    image_url: string | null;
    source: string;
    published_at: string;
};