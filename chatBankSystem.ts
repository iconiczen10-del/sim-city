import type { ChatCell, ChatTopic } from './chatTypes';

const kinds: { topic: ChatTopic; kind: string; lines: string[] }[] = [
  { topic: 'general', kind: 'group_created', lines: ['Group created: {groupName}', 'A new group was created: {groupName}', '{groupName} group started', 'The group is now open: {groupName}', 'Welcome to {groupName}', 'This group was created for team updates', 'The employee group is ready', 'Group opened for company messages'] },
  { topic: 'hiring', kind: 'join', lines: ['{name} was added', '{name} joined the group', 'Welcome, {name}', '{name} is now in the group', 'A new colleague joined: {name}', '{name} was added to the conversation', 'Please welcome {name}', '{name} joined the team chat', '{name} is here now', 'New member: {name}'] },
  { topic: 'leavings', kind: 'leave', lines: ['{name} left the group', '{name} is no longer in the group', '{name} left the conversation', '{name} exited the group', '{name} is no longer a member', 'Group membership updated: {name}', '{name} left the team chat', 'Membership changed for {name}'] },
  { topic: 'office_politics', kind: 'group_name_change', lines: ['Group name changed to {groupName}', 'The group is now called {groupName}', 'Name updated: {groupName}', 'This chat is now {groupName}', 'Group title changed to {groupName}', 'New group name: {groupName}', '{groupName} is the current group title', 'The title was updated to {groupName}', 'Group renamed: {groupName}', 'A new name was set: {groupName}', 'The conversation is now {groupName}', 'Name change saved: {groupName}'] },
  { topic: 'policy', kind: 'pinned', lines: ['A message was pinned', 'A message was pinned for the group', 'Pinned message updated', 'The group has a new pinned message', 'A message was added to pins', 'Pinned content changed', 'The pinned note is available above', 'A message is now pinned', 'Group pin updated', 'Pinned message saved'] },
  { topic: 'factory_floor', kind: 'mute', lines: ['Notifications were muted', 'Group notifications are muted', 'Mute settings changed', 'Notifications are paused for this group', 'Group alert settings were updated', 'Notification preference saved'] },
  { topic: 'export_orders', kind: 'forwarded', lines: ['Forwarded {forwardCount} times', 'This message was forwarded {forwardCount} times', 'Forward count: {forwardCount}', 'Shared again: {forwardCount} forwards', 'Forwarded message · {forwardCount}', 'This note has been shared {forwardCount} times', 'Forward count updated to {forwardCount}', 'Message forwarded {forwardCount} times', 'Shared with the group {forwardCount} times', 'Forwarded from another chat', 'A forwarded message was shared', 'Forwarded note', 'Shared message', 'Forwarded update', 'Message shared from another conversation'] },
  { topic: 'ceo', kind: 'ceo_annual', lines: ['Leadership update: {name} is CEO', '{name} is now CEO', 'CEO appointment recorded: {name}', 'Leadership role updated for {name}'] },
];

export const chatBankSystem: ChatCell[] = kinds.map(({ topic, kind, lines }) => ({
  act: 'system',
  topic,
  archetype: 'formal',
  variants: lines.map((text, index) => ({ id: `system:${kind}:${index + 1}`, weight: 1, text })),
}));
