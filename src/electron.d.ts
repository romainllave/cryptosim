export { };

declare global {
    interface Window {
        electron: {
            getVersion: () => Promise<string>;
            checkUpdates: () => void;
            onUpdateStatus: (callback: (data: any) => void) => void;
            expandWindow: () => void;
        };
    }
}
