import type { ChatAct, ChatCell, ChatTopic } from './chatTypes';

type CellSpec = [ChatAct, ChatTopic, [string, string, string]];

const openers = ['', 'wait, ', 'okay but ', 'sorry, '];
const cells: CellSpec[] = [
  ['grievance', 'payroll', ['my salary is short again', 'short by {shortAmount}. rent due in {daysToRent} days', 'is this permanent or just this month']],
  ['grievance', 'layoffs', ['no one knows who is next', 'the team feels really quiet today', 'please just tell us what is confirmed']],
  ['grievance', 'mart_prices', ['the essentials cost more again', 'i am skipping lunch this week', 'the water price changed overnight']],
  ['grievance', 'board', ['they voted before we heard anything', 'does this mean more cuts for us', 'i do not know how to plan around this']],
  ['grievance', 'ceo', ['we need an answer from {ceoFirstName}', 'why is nobody saying anything', 'the silence is making this worse']],
  ['grievance', 'export_orders', ['another deadline moved up', 'we are already short on the floor', 'how are we meant to cover this']],
  ['question', 'payroll', ['did your pay come in lower too', 'when will they explain the change', 'is there a correction coming']],
  ['question', 'board', ['what did the vote actually mean', 'are they meeting again this week', 'does anyone have the real minutes']],
  ['question', 'policy', ['which rule are we meant to follow', 'did the form change again', 'can someone explain this simply']],
  ['question', 'layoffs', ['is the list actually final', 'are contractors included too', 'who is allowed to confirm this']],
  ['question', 'hiring', ['are they still hiring people', 'does this mean our team is growing', 'who is training the new starter']],
  ['question', 'general', ['anyone know what happens next', 'did i miss an update', 'is this confirmed anywhere']],
  ['question', 'export_orders', ['is the new order confirmed', 'who is covering the late shift', 'did the delivery date move again']],
  ['question', 'mart_prices', ['is the staff discount still working', 'did the lunch price change too', 'anyone know what is affordable now']],
  ['question', 'vij_capital', ['does this affect our company too', 'is that number real or just a headline', 'can someone from finance explain']],
  ['question', 'factory_floor', ['is the line still down', 'who is covering the next shift', 'did maintenance confirm anything']],
  ['question', 'vijtech_poaching', ['are they really hiring across the group', 'did anyone get a message from them', 'should we be worried about people leaving']],
  ['rant', 'payroll', ['i cannot sleep\nwhat if it cuts again\nwhat if rent is late', 'worked overtime and still came up short', 'third month of checking every rupee']],
  ['rant', 'layoffs', ['i keep refreshing for a list\nthis is exhausting', 'everyone is whispering and nobody knows', 'how are we supposed to focus today']],
  ['aside', 'board', ['wait what', 'this feels bad', 'hmm okay']],
  ['aside', 'payroll', ['same here', 'mine too', 'not again']],
  ['aside', 'ceo', ['where is {ceoFirstName}', 'no update yet', 'that is not great']],
  ['aside', 'general', ['yaar really', 'bhai what', 'same honestly']],
  ['aside', 'mart_prices', ['too expensive now', 'not buying that', 'price went up again']],
  ['support', 'layoffs', ['please check on your people', 'we will get through today', 'text me if you need help']],
  ['support', 'leavings', ['sorry they had to go', 'hope they are okay', 'we should say goodbye']],
  ['support', 'policy', ['you are not alone in this', 'ask me if you need help', 'take the time you need']],
  ['reflection', 'payroll', ['what if this keeps happening', 'i used to save a little each month', 'maybe i should ask about another role']],
  ['reflection', 'layoffs', ['what if our team is next', 'i keep thinking about the people who left', 'maybe we should check in on each other']],
  ['reflection', 'ceo', ['what if leadership does not answer', 'we need someone to talk to us', 'i miss when updates were clear']],
  ['reflection', 'general', ['today feels longer than usual', 'trying not to overthink everything', 'maybe tomorrow will be clearer']],
  ['grievance', 'vij_capital', ['money moves upstairs while we wait', 'why is the wider group so quiet', 'this does not feel fair to us']],
  ['question', 'executives', ['did anyone hear what executives decided', 'are they speaking to staff soon', 'who is sharing the update']],
  ['question', 'leavings', ['did they really leave already', 'are we allowed to ask what happened', 'who is taking over their work']],
  ['aside', 'hiring', ['new faces again', 'hope they are nice', 'more training this week']],
];

export const chatBankAnxious: ChatCell[] = cells.map(([act, topic, fragments]) => ({
  act,
  topic,
  archetype: 'anxious',
  variants: openers.flatMap((opener, openerIndex) => fragments.map((fragment, fragmentIndex) => {
    const index = openerIndex * fragments.length + fragmentIndex;
    const phase = index >= 10 ? 3 : index >= 8 ? 2 : 1;
    return {
      id: `anxious:${act}:${topic}:${index + 1}`,
      weight: phase === 3 ? 0.4 : phase === 2 ? 0.6 : 1,
      text: `${opener}${fragment}`,
      ...(phase > 1 ? { minPhase: phase as 2 | 3 } : {}),
    };
  })),
}));
