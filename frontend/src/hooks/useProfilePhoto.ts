import { useMutation } from '@tanstack/react-query'
import api from '../lib/api'

export function useUploadProfilePhoto() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('photo', file)
      return api.post('/users/me/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data)
    },
  })
}
