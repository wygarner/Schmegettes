import nlp from 'compromise';

const getInterrogativeAndVerb = (clue: string): string => {
  // Use Compromise to parse the clue
  const doc = nlp(clue);

  // Extract the subject and determine its type (person, thing, place, time)
  const subject = doc.match('#Subject').out('text');
  const isPlural = subject.endsWith('s');  // Basic plural check (can be refined)
  
  // Determine the question type based on the subject
  if (!subject) return 'What is'; // Default if no subject found

  // Apply rules for common question types
  if (subject.includes('who')) {
    return isPlural ? 'Who are' : 'Who is';
  }
  if (subject.includes('where')) {
    return isPlural ? 'Where are' : 'Where is';
  }
  if (subject.includes('when')) {
    return 'When is';
  }

  return isPlural ? 'What are' : 'What is'; // Default to "What is" or "What are"
};

export default getInterrogativeAndVerb;
