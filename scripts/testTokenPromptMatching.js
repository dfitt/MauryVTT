function isTokenMentionedInPrompt(tokenLabel, prompt) {
  if (!tokenLabel || !prompt) return false;

  const cleanPrompt = prompt.toLowerCase().replace(/'s\b/g, "");
  const cleanLabel = tokenLabel.trim().toLowerCase().replace(/'s\b/g, "");
  if (!cleanLabel || !cleanPrompt) return false;

  // Full label match with word boundaries
  const escapedLabel = cleanLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fullLabelRegex = new RegExp(`\\b${escapedLabel}\\b`, "i");
  if (fullLabelRegex.test(cleanPrompt)) return true;

  const promptWords = new Set(cleanPrompt.match(/\b[a-z0-9-]+\b/g) || []);
  const labelWords = cleanLabel.split(/[^a-z0-9-]+/i).filter((w) => w.length > 0);

  const STOP_WORDS = new Set([
    "the", "a", "an", "of", "in", "to", "for", "with", "on", "at", "by", "from",
    "and", "or", "is", "it", "as", "be", "this", "that", "my", "your", "his", "her", "their"
  ]);

  for (const word of labelWords) {
    if (labelWords.length > 1 && STOP_WORDS.has(word)) continue;
    if (promptWords.has(word)) {
      return true;
    }
  }

  return false;
}

// Test 1: User's example (Jack Ford, Burglecut, Henry Car)
const prompt1 = "jack throws a chair at car";
if (isTokenMentionedInPrompt("Jack Ford", prompt1) !== true) throw new Error("Test 1a failed");
if (isTokenMentionedInPrompt("Burglecut", prompt1) !== false) throw new Error("Test 1b failed");
if (isTokenMentionedInPrompt("Henry Car", prompt1) !== true) throw new Error("Test 1c failed");

// Test 2: Possessives
const prompt2 = "jack's sword strikes Henry";
if (isTokenMentionedInPrompt("Jack Ford", prompt2) !== true) throw new Error("Test 2a failed");
if (isTokenMentionedInPrompt("Henry Car", prompt2) !== true) throw new Error("Test 2b failed");

// Test 3: Stop word handling
const prompt3 = "the apple is red";
if (isTokenMentionedInPrompt("The Goblin", prompt3) !== false) throw new Error("Test 3 failed");

// Test 4: Word boundary protection
const prompt4 = "Robin runs away";
if (isTokenMentionedInPrompt("Rob", prompt4) !== false) throw new Error("Test 4 failed");

console.log("ALL TOKEN PROMPT MATCHING TESTS PASSED SUCCESSFULLY!");
