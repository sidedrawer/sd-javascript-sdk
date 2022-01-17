export class UtilsHelper {
    public static removeEmptyEntriesFromObject<T>(object: T): Partial<T> {
        return Object.entries(object)
            .filter(([_, v]) => v != null)
            .reduce((acc, [k, v]) => ({...acc, [k]: v}), {});
    }

    public static generateCorrelationId(): string {
        return new Date()
            .toISOString()
            .replaceAll('-','')
            .replaceAll(':','')
            .replaceAll('.','')
            .trim();
    }

    public static generateFileName(name: string, hasExtension = true): string {
        let formattedName = '';
        if (hasExtension) {
            const nameAux = name.split('.');
            nameAux.splice(-1, 1);
            formattedName = nameAux.join('.');
        } else {
            formattedName = name;
        }
        formattedName = formattedName.split(' ').join('_');
        formattedName = formattedName.replace(/[^a-zA-Z0-9._%-]/g, '_');
        return formattedName.replace(/%/g, '_');
    }
}
