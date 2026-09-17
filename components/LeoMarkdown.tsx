import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/theme-provider';

type Block =
  | { type: 'h'; level: number; text: string }
  | { type: 'p'; text: string }
  | { type: 'li'; ordered: boolean; index: number; text: string }
  | { type: 'code'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let code: string[] | null = null;
  let table: string[][] | null = null;

  const flushTable = () => {
    if (!table || table.length < 2) {
      table = null;
      return;
    }
    const headers = table[0] ?? [];
    const rows = table.slice(2);
    blocks.push({ type: 'table', headers, rows });
    table = null;
  };

  for (const raw of lines) {
    if (code) {
      if (raw.trim().startsWith('```')) {
        blocks.push({ type: 'code', text: code.join('\n') });
        code = null;
      } else code.push(raw);
      continue;
    }
    if (raw.trim().startsWith('```')) {
      flushTable();
      code = [];
      continue;
    }
    if (raw.trim().startsWith('|')) {
      const cells = raw
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());
      if (!table) table = [];
      table.push(cells);
      continue;
    }
    flushTable();
    const heading = raw.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: 'h', level: heading[1].length, text: heading[2] ?? '' });
      continue;
    }
    const bullet = raw.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      blocks.push({ type: 'li', ordered: false, index: 0, text: bullet[1] ?? '' });
      continue;
    }
    const numbered = raw.match(/^\s*(\d+)\.\s+(.*)$/);
    if (numbered) {
      blocks.push({ type: 'li', ordered: true, index: Number(numbered[1]), text: numbered[2] ?? '' });
      continue;
    }
    if (!raw.trim()) continue;
    blocks.push({ type: 'p', text: raw });
  }
  if (code) blocks.push({ type: 'code', text: code.join('\n') });
  flushTable();
  return blocks;
}

function Inline({ text, color, accent }: { text: string; color: string; accent: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <Text style={{ color, lineHeight: 22, fontSize: 16 }}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={index} style={{ fontWeight: '800' }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <Text key={index} style={{ fontFamily: 'monospace', color: accent }}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
}

export function LeoMarkdown({ text }: { text: string }) {
  const { colors } = useTheme();
  const blocks = parseBlocks(text);
  return (
    <View style={{ gap: 8 }}>
      {blocks.map((block, index) => {
        if (block.type === 'h') {
          return (
            <Text
              key={index}
              style={{
                color: colors.text,
                fontWeight: '800',
                fontSize: block.level === 1 ? 20 : block.level === 2 ? 18 : 16,
              }}
            >
              {block.text}
            </Text>
          );
        }
        if (block.type === 'code') {
          return (
            <Text
              key={index}
              style={{
                color: colors.text,
                backgroundColor: colors.accentSoft,
                padding: 10,
                borderRadius: 10,
                fontFamily: 'monospace',
                fontSize: 13,
              }}
            >
              {block.text}
            </Text>
          );
        }
        if (block.type === 'li') {
          return (
            <View key={index} style={styles.row}>
              <Text style={{ color: colors.text, fontWeight: '800', width: 22 }}>
                {block.ordered ? `${block.index}.` : '•'}
              </Text>
              <View style={{ flex: 1 }}>
                <Inline text={block.text} color={colors.text} accent={colors.accent} />
              </View>
            </View>
          );
        }
        if (block.type === 'table') {
          return (
            <View key={index} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden' }}>
              <View style={[styles.tableRow, { backgroundColor: colors.accentSoft }]}>
                {block.headers.map((cell) => (
                  <Text key={cell} style={[styles.cell, { color: colors.text, fontWeight: '800' }]}>
                    {cell}
                  </Text>
                ))}
              </View>
              {block.rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.tableRow}>
                  {row.map((cell, cellIndex) => (
                    <Text key={cellIndex} style={[styles.cell, { color: colors.text }]}>
                      {cell}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          );
        }
        const link = block.text.match(/https?:\/\/\S+/);
        if (link) {
          return (
            <Pressable key={index} onPress={() => void Linking.openURL(link[0])}>
              <Inline text={block.text} color={colors.text} accent={colors.accent} />
            </Pressable>
          );
        }
        return <Inline key={index} text={block.text} color={colors.text} accent={colors.accent} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, gap: 8 },
  cell: { flex: 1, fontSize: 13 },
});
