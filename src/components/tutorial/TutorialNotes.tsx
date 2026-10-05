import { StickyNote } from '../rack/StickyNote';
import { DEFINITIONS, MODULE_HEIGHT, type RackModule } from '@/lib/modules';
import { noteOverlaps } from '@/lib/sticky-notes';

const notes = [
  {
    id: 'tempo',
    moduleId: 'garden-rhythm',
    x: 22,
    y: 219,
    width: 214,
    height: 145,
    rotation: -5,
    label: 'PULSE / TEMPO',
    text: 'Turn down to slow the whole patch.',
  },
  {
    id: 'bells',
    moduleId: 'garden-bell',
    x: 38,
    y: 192,
    width: 208,
    height: 149,
    rotation: 4,
    label: 'TINE / DECAY',
    text: 'Turn up to let the bells ring longer.',
  },
  {
    id: 'room',
    moduleId: 'garden-space',
    x: 28,
    y: 40,
    width: 208,
    height: 149,
    rotation: -4,
    label: 'HALO / DECAY',
    text: 'Turn up to make the room ring for longer.',
  },
];

export function TutorialNotes({
  modules,
  activeModuleIds,
}: {
  modules: RackModule[];
  activeModuleIds: (string | null)[];
}) {
  const active = modules.filter((m) => activeModuleIds.includes(m.id));
  return (
    <>
      {notes.map((note) => {
        const anchor = modules.find((m) => m.id === note.moduleId);
        if (!anchor) return null;
        const bounds = { ...note, x: anchor.x + note.x, y: anchor.y + note.y, scale: 0.6 };
        return (
          <StickyNote
            key={note.id}
            {...bounds}
            id={`garden-note-${note.id}`}
            faded={active.some((m) =>
              noteOverlaps(bounds, {
                x: m.x,
                y: m.y,
                width: DEFINITIONS[m.type].width,
                height: MODULE_HEIGHT,
              }),
            )}
          >
            {note.text}
          </StickyNote>
        );
      })}
    </>
  );
}
