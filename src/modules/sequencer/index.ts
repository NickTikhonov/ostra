import type { ModulePlugin } from '../types';
import { definition } from './definition.js';
import Panel from './Panel';
import styles from './panel.module.css';
export default { definition, Panel, className: styles.panel } satisfies ModulePlugin;
