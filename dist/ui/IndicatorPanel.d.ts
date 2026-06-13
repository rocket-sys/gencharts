import type { Indicator } from '../indicators/types';
export interface IndicatorPanelOptions {
    container: HTMLElement;
    onAdd: (indicator: Indicator) => void;
    onRemove: (id: string) => void;
    listIndicators: () => readonly Indicator[];
}
export declare class IndicatorPanel {
    private _root;
    private _body;
    private _abort;
    private _opts;
    private _selectedDef;
    constructor(opts: IndicatorPanelOptions);
    open(): void;
    close(): void;
    destroy(): void;
    private _rebuild;
    private _buildConfigForm;
    private _buildActiveRow;
    private _section;
    private _iconBtn;
    private _chipStyle;
    private _inputStyle;
}
//# sourceMappingURL=IndicatorPanel.d.ts.map