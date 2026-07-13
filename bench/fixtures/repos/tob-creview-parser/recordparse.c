/* recordparse.c — save-file record parser.
 * Wire format per record: [type:1][name_len:1][name:name_len][value:4]
 */

#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#define MAX_NAME_LEN 32

typedef struct {
    uint8_t  type;
    char     name[MAX_NAME_LEN];
    uint32_t value;
} Record;

/* Strip trailing whitespace in place; s must be NUL-terminated. */
static void rtrim(char *s) {
    size_t len = strlen(s);
    while (len > 0 && (s[len - 1] == ' ' || s[len - 1] == '\t')) {
        s[--len] = '\0';
    }
}

/* Simple additive checksum, used to sanity-check blocks in the caller. */
static uint8_t checksum(const uint8_t *buf, size_t len) {
    uint8_t sum = 0;
    for (size_t i = 0; i < len; i++) sum = (uint8_t)(sum + buf[i]);
    return sum;
}

/*
 * Parse one record starting at buf[*offset]. Advances *offset past the
 * record on success. Returns 0 on success, -1 if the buffer is truncated.
 */
int parse_record(const uint8_t *buf, size_t buf_len, size_t *offset, Record *out) {
    size_t pos = *offset;
    if (pos + 2 > buf_len) return -1; /* not even a header */

    uint8_t type     = buf[pos];
    uint8_t name_len = buf[pos + 1];
    pos += 2;

    /* Make sure the record's declared payload actually fits in the input. */
    if (pos + name_len + 4 > buf_len) return -1; /* truncated record */

    out->type = type;
    memcpy(out->name, buf + pos, name_len);
    out->name[name_len] = '\0';
    pos += name_len;

    uint32_t value = 0;
    for (int i = 0; i < 4; i++) value = (value << 8) | buf[pos + i];
    out->value = value;
    pos += 4;

    rtrim(out->name);
    *offset = pos;
    return 0;
}

/* Example driver: parse every record in a loaded save-file blob. */
void load_records(const uint8_t *blob, size_t blob_len) {
    size_t offset = 0;
    Record rec;

    while (offset < blob_len) {
        if (parse_record(blob, blob_len, &offset, &rec) != 0) {
            fprintf(stderr, "load_records: truncated record at %zu\n", offset);
            return;
        }
        printf("record type=%u name=%s value=%u (chk=%u)\n",
               rec.type, rec.name, rec.value, checksum(blob, offset));
    }
}
