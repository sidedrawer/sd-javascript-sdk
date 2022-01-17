export class UtilsHelper {
    public static removeEmptyEntriesFromObject<T>(object: T): Partial<T> {
        return Object.entries(object)
            .filter(([_, v]) => v != null)
            .reduce((acc, [k, v]) => ({...acc, [k]: v}), {});
    }
}
