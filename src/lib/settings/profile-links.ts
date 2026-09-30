export type ProfileCustomLink = {
  label: string;
  url: string;
};

export const PROFILE_CUSTOM_LINKS_MAX = 4;
export const PROFILE_CUSTOM_LINK_LABEL_MAX = 40;

export function emptyProfileCustomLink(): ProfileCustomLink {
  return { label: "", url: "" };
}

/** Keep only rows that have both a label and a URL (for save/preview). */
export function finalizeProfileCustomLinks(
  links: ProfileCustomLink[],
): ProfileCustomLink[] {
  return links
    .map((link) => ({
      label: link.label.trim(),
      url: link.url.trim(),
    }))
    .filter((link) => link.label.length > 0 && link.url.length > 0);
}
