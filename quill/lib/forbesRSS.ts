export async function fetchForbesRSS(section: string): Promise<string | null> {
  const sectionMap: Record<string, string> = {
    "Technology": "https://www.forbes.com/technology/feed/",
    "Leadership": "https://www.forbes.com/leadership/feed/",
    "Finance": "https://www.forbes.com/finance/feed/",
    "Entrepreneurs": "https://www.forbes.com/entrepreneurs/feed/",
    "Innovation": "https://www.forbes.com/innovation/feed/"
  };

  const feedUrl = sectionMap[section];
  if (!feedUrl) return null;

  try {
    const response = await fetch(feedUrl, { cache: "no-store" });
    if (!response.ok) {
      console.warn(`Failed to fetch RSS for ${section}: ${response.status}`);
      return null;
    }

    const xmlText = await response.text();
    
    // Simple regex parsing to avoid bringing in a heavy XML parsing dependency for just 5 items.
    const items: {title: string, description: string}[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let count = 0;

    while ((match = itemRegex.exec(xmlText)) !== null && count < 5) {
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/);
      const title = titleMatch ? (titleMatch[1] || titleMatch[2]).trim() : "No Title";
      
      const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/);
      let description = descMatch ? (descMatch[1] || descMatch[2]).trim() : "No Description";
      
      // Strip HTML tags from description if any
      description = description.replace(/<[^>]*>?/gm, '');

      items.push({ title, description });
      count++;
    }

    if (items.length === 0) {
        return null; // Did not parse correctly or empty feed
    }

    const formattedOutput = "RECENT FORBES COVERAGE ON THIS TOPIC:\n" + items.map(
      item => `- [${item.title}]: ${item.description}`
    ).join("\n");

    return formattedOutput;

  } catch (err) {
    console.warn(`RSS fetch exception for ${section}:`, err);
    return null; // Fail silently
  }
}
