#include <stdio.h>
#include <errno.h>
#include <string.h>
#include <stdlib.h>

/* base64 stuff https://stackoverflow.com/questions/342409/how-do-i-base64-encode-decode-in-c */

//------------------------------------------------------------------------------

static char encoding_table[] = {'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
                                'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
                                'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
                                'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
                                'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
                                'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
                                'w', 'x', 'y', 'z', '0', '1', '2', '3',
                                '4', '5', '6', '7', '8', '9', '+', '/'};
static char *decoding_table = NULL;
static int mod_table[] = {0, 2, 1};


char *base64_encode(const unsigned char *data,
                    size_t input_length,
                    size_t *output_length) {

    *output_length = 4 * ((input_length + 2) / 3);

    char *encoded_data = malloc(*output_length + 1);
    if (encoded_data == NULL) return NULL;

    for (int i = 0, j = 0; i < input_length;) {

        uint32_t octet_a = i < input_length ? (unsigned char)data[i++] : 0;
        uint32_t octet_b = i < input_length ? (unsigned char)data[i++] : 0;
        uint32_t octet_c = i < input_length ? (unsigned char)data[i++] : 0;

        uint32_t triple = (octet_a << 0x10) + (octet_b << 0x08) + octet_c;

        encoded_data[j++] = encoding_table[(triple >> 3 * 6) & 0x3F];
        encoded_data[j++] = encoding_table[(triple >> 2 * 6) & 0x3F];
        encoded_data[j++] = encoding_table[(triple >> 1 * 6) & 0x3F];
        encoded_data[j++] = encoding_table[(triple >> 0 * 6) & 0x3F];
    }

    for (int i = 0; i < mod_table[input_length % 3]; i++)
        encoded_data[*output_length - 1 - i] = '=';

    encoded_data[*output_length] = '\0';
    return encoded_data;
}

void base64_cleanup() {
    free(decoding_table);
}

//------------------------------------------------------------------------------

int main(int argc, char **argv)
{
  FILE          *js_file       = NULL;
  FILE          *wasm_file     = NULL;
  char          *wasm_file_buf = NULL;
  int            state         = 0;
  unsigned char  c             = 0;
  char          *b64data       = NULL;
  size_t         b64data_len   = 0;
  size_t         wasm_file_len = 0;
  size_t         nread         = 0;
  size_t         nread_tot     = 0;

  if (argc != 3) {
    fprintf(stderr, "usage: %s JS_FILE WASM_FILE\n", argv[0]);
    return 1;
  }

  js_file = fopen(argv[1], "rb");
  if (js_file == NULL) {
    fprintf(stderr, "fopen(%s,\"rb\"): %s\n", argv[1], strerror(errno));
    return 2;
  }

  wasm_file = fopen(argv[2], "rb");
  if (wasm_file == NULL) {
    fclose(js_file);
    fprintf(stderr, "fopen(%s, \"rb\"): %s\n", argv[2], strerror(errno));
    return 3;
  }

  c = fgetc(js_file);
  /* sed s/wasmBinaryFile=\"[^\"]*\"/wasmBinaryFile="data:application/octet;base64,<BASE64 of wasm file>" */
  while (!feof(js_file)) {
    switch(state) {
      case 0:  if (c == 'w') { state = 1;  } else { state = 0; } break;
      case 1:  if (c == 'a') { state = 2;  } else { state = 0; } break;
      case 2:  if (c == 's') { state = 3;  } else { state = 0; } break;
      case 3:  if (c == 'm') { state = 4;  } else { state = 0; } break;
      case 4:  if (c == 'B') { state = 5;  } else { state = 0; } break;
      case 5:  if (c == 'i') { state = 6;  } else { state = 0; } break;
      case 6:  if (c == 'n') { state = 7;  } else { state = 0; } break;
      case 7:  if (c == 'a') { state = 8;  } else { state = 0; } break;
      case 8:  if (c == 'r') { state = 9;  } else { state = 0; } break;
      case 9:  if (c == 'y') { state = 10; } else { state = 0; } break;
      case 10: if (c == 'F') { state = 11; } else { state = 0; } break;
      case 11: if (c == 'i') { state = 12; } else { state = 0; } break;
      case 12: if (c == 'l') { state = 13; } else { state = 0; } break;
      case 13: if (c == 'e') { state = 14; } else { state = 0; } break;
      case 14: if (c == '=') { state = 15; } else { state = 0; } break;
      case 15: if (c == '"') { state = 16; } else { state = 0; } break;
      case 16:
        printf("data:application/octet-stream;base64,");
        /* OUTPUT base64 */
	fseek(wasm_file, 0, SEEK_END);
	wasm_file_len = ftell(wasm_file);
	fseek(wasm_file, 0, SEEK_SET);
	wasm_file_buf = malloc(wasm_file_len);
	while (nread_tot < wasm_file_len) {
          size_t rem = wasm_file_len - nread_tot;
          nread = fread(&wasm_file_buf[nread_tot], 1, rem, wasm_file);
	  if (nread == 0) {
            fprintf(stderr, "fread(): %s\n", strerror(errno));
	    break;
	  }
	  nread_tot += nread;
	}
	b64data = base64_encode(wasm_file_buf, wasm_file_len, &b64data_len);
	printf("%s", b64data);
	base64_cleanup(b64data);
	free(wasm_file_buf);
	state = 17;
      case 17: if (c == '"') { state = 18; } break;
      case 18: break;

      
    }
    if (state != 17) {
      printf("%c", c);
    }
    c = fgetc(js_file);
  }

  fclose(js_file);
  fclose(wasm_file);
  
  return 0;
}
