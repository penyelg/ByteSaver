import { supabase } from '../../../lib/supabase';
import { normalizeMobile, validateIdentityPhoto } from '../utils/verification';

export async function submitIdentity(userId, details, file) {
  const validationError = validateIdentityPhoto(file);
  if (validationError) throw new Error(validationError);
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('identity-documents')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { error } = await supabase.rpc('submit_identity', {
    p_full_name: details.fullName.trim(), p_address: details.address.trim(),
    p_phone: normalizeMobile(details.phone), p_barangay_id: details.barangayId,
    p_id_type: details.idType, p_document_path: path,
  });
  // Private uploads are immutable. Unreferenced uploads require trusted retention cleanup.
  if (error) throw error;
}
