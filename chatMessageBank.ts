// chatMessageBank.ts — Topic, voice, and act-specific messages for generated employee chat
import { chatBankAnxious } from './chatBankAnxious';
import { chatBankFormal } from './chatBankFormal';
import { chatBankSystem } from './chatBankSystem';
import type { ChatAct, ChatArchetype, ChatTopic, ChatVariant } from './chatTypes';

const topics: Record<ChatTopic, string[]> = {
  payroll: ['my payslip looks different this month', 'did anyone get a clear payroll update', 'rent is due before the next correction run', 'the deduction line changed again', 'mine is short too', 'payroll needs to explain this properly', 'waiting for one confirmed answer', 'anyone else checking their balance'],
  board: ['that meeting sounded serious', 'does anyone know what the vote means for us', 'the summary still leaves questions', 'maybe wait for the actual minutes', 'not sure what happens next', 'that was a lot to take in', 'any update from the board yet', 'we should hear something soon'],
  layoffs: ['the floor feels quiet today', 'please do not share unconfirmed names', 'does anyone know what is confirmed', 'check in on your team today', 'no one wants to ask out loud', 'the rumours are getting worse', 'we need a clear timeline', 'hope everyone is doing okay'],
  ceo: ['did anyone see the leadership note', 'waiting for a direct update', 'this changes the mood in the room', 'maybe the town hall will help', 'does anyone know when they will speak', 'hard to plan without details', 'we need a clear answer', 'still waiting to hear more'],
  executives: ['another meeting upstairs today', 'hope they bring floor feedback this time', 'anyone know what was decided', 'we could use a short summary', 'lots happening above us', 'is the review finished yet', 'waiting for something confirmed', 'maybe the next note explains it'],
  export_orders: ['the delivery date moved again', 'who is covering the late shift', 'the order is bigger than expected', 'packing list changed one more time', 'nice work getting it out', 'we need a clearer cutoff', 'any update from the client', 'the floor is stretched today'],
  factory_floor: ['the line is behind again', 'handover notes are up', 'who can cover the late shift', 'machine three is running now', 'busy day on the floor', 'please check the new roster', 'tea break saved the shift', 'maintenance has not replied yet'],
  mart_prices: ['the essentials cost more again', 'is the staff discount working', 'lunch queue was wild today', 'water price changed overnight', 'not buying that this week', 'anyone try the new combo', 'the list on the board changed', 'that canteen tea still hits'],
  vijtech_poaching: ['heard they are hiring again', 'anyone see the new roles list', 'keep your options open', 'someone got a recruiter message', 'a lot of movement this month', 'could just be normal hiring', 'please do not share private details', 'wonder who is leaving next'],
  vij_capital: ['does that deal affect our team', 'the headline sounds huge', 'anyone read the actual filing', 'maybe wait for the real numbers', 'another finance update today', 'hard to tell what it means', 'can someone explain it simply', 'not sure this reaches us'],
  office_politics: ['let us keep this kind', 'the hallway version is not the whole story', 'please use the right channel', 'maybe we missed some context', 'no need to name anyone here', 'can we separate facts from guesses', 'take this one offline maybe', 'a calm question helps more'],
  hiring: ['welcome to the new starters', 'anyone know when onboarding begins', 'who is joining the afternoon shift', 'buddy schedule is up now', 'good to see roles moving', 'new paperwork is ready', 'we need more hands on export', 'hope the first week goes well'],
  leavings: ['hope they are doing okay', 'it will feel different without them', 'give people space to share their news', 'handover notes are ready', 'we should say goodbye properly', 'one less familiar face at tea', 'who is covering their work', 'wishing them well'],
  policy: ['which version of the form is current', 'did the rule change again', 'the old link is still floating around', 'can someone explain the new process', 'when does this take effect', 'a short faq would help', 'please use the current template', 'not sure the form got updated'],
  general: ['long day, team', 'thanks for helping each other', 'anyone else thinking about tea', 'the rain finally stopped', 'good shift today', 'lift on the east side is still down', 'lunch queue beat the meeting', 'see you all tomorrow'],
};

const shortReplies: Record<ChatTopic, string[]> = {
  payroll: ['same', 'mine too', 'wait what', 'ugh'], board: ['hmm', 'not great', 'wait what', 'same'],
  layoffs: ['this is hard', 'no idea', 'same here', 'ugh'], ceo: ['no update', 'wait what', 'hmm', 'same'],
  executives: ['again?', 'noted', 'hmm', 'same'], export_orders: ['too much', 'on it', 'yikes', 'same'],
  factory_floor: ['on my way', 'busy', 'yep', 'same'], mart_prices: ['too much', 'not buying', 'yaar', 'ugh'],
  vijtech_poaching: ['heard that', 'maybe', 'hmm', 'same'], vij_capital: ['big if true', 'no clue', 'hmm', 'same'],
  office_politics: ['fair point', 'lets not', 'heard', 'same'], hiring: ['welcome', 'nice', 'great', 'hope so'],
  leavings: ['take care', 'sorry yaar', 'oh no', 'same'], policy: ['which one', 'pls explain', 'again?', 'hmm'],
  general: ['yaar', 'bhai', 'same', 'hmm'],
};

const casualVoice: Record<ChatArchetype, (text: string) => string> = {
  loud: (text) => `${text} anyone else?`, anxious: (text) => `${text} anyone know what happens next`,
  formal: (text) => `please note: ${text}`, warm: (text) => `${text} hope everyone is okay`,
  sarcastic: (text) => `${text} love that for us`, executive: (text) => `${text} will share what is confirmed`,
  lurker: (text) => text, newbie: (text) => `${text} sorry did i miss something`,
  veteran: (text) => `${text} seen this before`, ceo: (text) => `${text} will share an update`,
};

const banks = [...chatBankFormal, ...chatBankAnxious, ...chatBankSystem];

export function getChatVariants(topic: ChatTopic, archetype: ChatArchetype, act: ChatAct): ChatVariant[] {
  const specialized = banks.flatMap((cell) => cell.topic === topic && cell.archetype === archetype && cell.act === act ? cell.variants : []);
  if (specialized.length) return specialized;
  const voice = casualVoice[archetype] ?? casualVoice.lurker;
  const full = (topics[topic] ?? topics.general).map((text) => voice(text).toLowerCase().replace(/\bi am\b/g, "i'm").replace(/\bcannot\b/g, 'cant').replace(/[.!?]+$/g, ''));
  return [...shortReplies[topic], ...full].map((text, index) => ({
    id: `casual:${act}:${topic}:${archetype}:${index + 1}`,
    weight: 1,
    text,
    ...(index >= 10 ? { minPhase: 3 as const } : index >= 8 ? { minPhase: 2 as const } : {}),
  }));
}

export function getMessageBankTopics(): ChatTopic[] {
  return Object.keys(topics) as ChatTopic[];
}
