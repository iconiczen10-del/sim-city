import type { ChatAct, ChatCell, ChatTopic } from './chatTypes';

type CellSpec = [ChatAct, ChatTopic, [string, string, string]];

const openings = ['Dear all,', 'Please note:', 'Reminder:', 'Kindly note:'];
const cells: CellSpec[] = [
  ['announcement', 'payroll', ['the revised pay statements are available; please verify the totals', 'the payroll adjustment will appear on this month’s statement', 'please report discrepancies to payroll before the next cycle']],
  ['announcement', 'board', ['the board has approved the next operating plan', 'the meeting summary will be shared after review', 'please follow the confirmed decision rather than informal updates']],
  ['announcement', 'layoffs', ['team discussions will happen privately with affected colleagues', 'please direct workforce questions to the relevant manager', 'no individual role changes are confirmed outside official notices']],
  ['announcement', 'policy', ['the revised leave policy takes effect next month', 'the current form is available in the shared folder', 'please use the updated process for all new requests']],
  ['announcement', 'hiring', ['onboarding details will be shared with new colleagues', 'the open roles are listed in the internal notice', 'please coordinate interview coverage with your manager']],
  ['announcement', 'general', ['the shift handover notes are ready for review', 'please submit the required update before close of business', 'the next operations note will follow after confirmation']],
  ['question', 'payroll', ['could payroll clarify the deduction on this month’s statement', 'is the revised payment date confirmed for everyone', 'may we have an estimate for the correction run']],
  ['question', 'policy', ['could someone confirm which version of the form is current', 'does this rule apply to every shift equally', 'is there a written exception process for this case']],
  ['question', 'board', ['has the final vote summary been circulated yet', 'could we confirm when the approved change takes effect', 'is there a staff briefing planned after the meeting']],
  ['aside', 'policy', ['the shared folder still contains the older template', 'the new checklist is easier to follow in practice', 'the wording on page two may need clarification']],
  ['aside', 'payroll', ['the timing is close to the usual cycle', 'the statement layout changed slightly this month', 'a short payroll note would prevent confusion']],
  ['aside', 'board', ['the agenda was longer than expected', 'the summary is clearer than the original draft', 'the next update should settle the remaining questions']],
  ['reflection', 'board', ['the decision has consequences beyond this quarter', 'clear communication matters most after a difficult vote', 'we should review the outcome once the full details arrive']],
  ['reflection', 'ceo', ['leadership changes are easier to process with a clear timeline', 'staff deserve a consistent update from the new office', 'the next address should answer the practical questions']],
  ['support', 'layoffs', ['please check in privately with colleagues who need support', 'managers can help direct people to the right resources', 'we should give affected teams time and space']],
  ['support', 'board', ['it is reasonable to ask for clarity before making plans', 'please share confirmed information when it becomes available', 'teams should have a chance to discuss the change']],
  ['support', 'general', ['thank you for keeping the handover clear', 'your help made the shift easier to coordinate', 'please let the team know if more support is needed']],
  ['speculation', 'board', ['the next review may clarify the operating plan', 'the vote could affect staffing priorities next month', 'we should wait for the approved minutes before drawing conclusions']],
  ['speculation', 'ceo', ['the new leadership may set a different reporting cadence', 'a town hall could address the open questions', 'the first update will likely define the next steps']],
  ['joke', 'general', ['the calendar has scheduled another meeting about meetings', 'the tea break remains the most stable department', 'the printer has submitted its own leave request']],
  ['joke', 'factory_floor', ['the line is moving faster than the tea trolley', 'the checklist has more signatures than the visitor book', 'the machine is finally cooperating with the schedule']],
  ['grievance', 'payroll', ['the deduction needs a clear written explanation', 'staff should receive the same payroll information at the same time', 'the adjustment is difficult to plan around without notice']],
  ['rant', 'payroll', ['a last-minute payroll note creates avoidable uncertainty', 'the process would benefit from a single confirmed source', 'repeated corrections make monthly planning difficult']],
  ['question', 'general', ['could we confirm the current point of contact', 'is there a final version of the update available', 'when should the team expect the next note']],
];

export const chatBankFormal: ChatCell[] = cells.map(([act, topic, fragments]) => ({
  act,
  topic,
  archetype: 'formal',
  variants: openings.flatMap((opening, openingIndex) => fragments.map((fragment, fragmentIndex) => {
    const index = openingIndex * fragments.length + fragmentIndex;
    const phase = index >= 8 ? 3 : index >= 4 ? 2 : 1;
    return {
      id: `formal:${act}:${topic}:${index + 1}`,
      weight: phase === 3 ? 0.4 : phase === 2 ? 0.6 : 1,
      text: `${opening} ${fragment}`,
      ...(phase > 1 ? { minPhase: phase as 2 | 3 } : {}),
    };
  })),
}));
