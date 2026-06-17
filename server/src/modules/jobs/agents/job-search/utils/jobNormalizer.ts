export function parseLinkedInTitleAndCompany(
  titleText: string,
  fallbackTitle: string
): { title: string; company: string } {
  let parsedTitle = fallbackTitle;
  let parsedCompany = 'Unknown Recruiter';

  if (titleText.toLowerCase().includes(' at ')) {
    const parts = titleText.split(/\s+at\s+/i);
    parsedTitle = parts[0]?.trim();
    parsedCompany = parts[1]?.split(/[\-\|]/)[0]?.trim() || 'Hiring Company';
  } else if (titleText.toLowerCase().includes(' hiring ')) {
    const parts = titleText.split(/\s+hiring\s+/i);
    parsedCompany = parts[0]?.trim();
    parsedTitle = parts[1]?.split(/[\-\|]/)[0]?.trim() || fallbackTitle;
  } else if (titleText.includes('-')) {
    const parts = titleText.split('-');
    parsedTitle = parts[0]?.trim() || fallbackTitle;
    parsedCompany = parts[1]?.trim() || 'Hiring Company';
  } else {
    const parts = titleText.split(/[\-\|]/);
    parsedTitle = parts[0]?.trim() || fallbackTitle;
    parsedCompany = parts[1]?.trim() || 'Hiring Company';
  }

  parsedTitle = parsedTitle.replace(/\s+Job\s*$/i, '').replace(/hiring\s*$/i, '').trim();

  return {
    title: parsedTitle,
    company: parsedCompany
  };
}

export function parseNaukriTitleAndCompany(
  titleText: string,
  fallbackTitle: string
): { title: string; company: string } {
  const parts = titleText.split(/\s*-\s*/);
  let parsedTitle = parts[0]?.trim() || fallbackTitle;
  let parsedCompany = parts[1]?.trim() || 'Naukri Recruiter';

  parsedTitle = parsedTitle.replace(/\s+Job\s*$/i, '').trim();

  return {
    title: parsedTitle,
    company: parsedCompany
  };
}
