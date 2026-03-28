import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { emergencyContactsAPI, EmergencyContact } from '../services/api';
import { Colors } from '../constants/Colors';
import i18n from '../utils/i18n';
import { showMessage, showConfirm } from '../utils/alert';

const RELATIONSHIPS = [
  { value: 'Mother', labelEn: 'Mother', labelFr: 'Mere' },
  { value: 'Father', labelEn: 'Father', labelFr: 'Pere' },
  { value: 'Spouse', labelEn: 'Spouse', labelFr: 'Conjoint(e)' },
  { value: 'Sibling', labelEn: 'Sibling', labelFr: 'Frere/Soeur' },
  { value: 'Friend', labelEn: 'Friend', labelFr: 'Ami(e)' },
  { value: 'Colleague', labelEn: 'Colleague', labelFr: 'Collegue' },
  { value: 'Neighbor', labelEn: 'Neighbor', labelFr: 'Voisin(e)' },
  { value: 'Other', labelEn: 'Other', labelFr: 'Autre' },
];

const MAX_CONTACTS = 3;

export default function EmergencyContactsScreen() {
  const router = useRouter();
  const isFr = i18n.locale === 'fr';

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showRelationshipPicker, setShowRelationshipPicker] = useState<number | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await emergencyContactsAPI.getContacts();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Error loading emergency contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const addContact = () => {
    if (contacts.length >= MAX_CONTACTS) {
      showMessage(
        isFr ? 'Limite atteinte' : 'Limit Reached',
        isFr ? 'Maximum 3 contacts autorise.' : 'Maximum 3 contacts allowed.'
      );
      return;
    }
    setContacts([...contacts, { name: '', phone: '', relationship: 'Friend' }]);
    setHasChanges(true);
  };

  const updateContact = (index: number, field: keyof EmergencyContact, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
    setHasChanges(true);
  };

  const removeContact = (index: number) => {
    showConfirm(
      isFr ? 'Supprimer le contact?' : 'Remove contact?',
      isFr ? 'Ce contact ne sera plus notifie en cas d\'urgence.' : 'This contact will no longer be notified in emergencies.',
      () => {
        const updated = contacts.filter((_, i) => i !== index);
        setContacts(updated);
        setHasChanges(true);
      }
    );
  };

  const saveContacts = async () => {
    const validContacts = contacts.filter(c => c.name.trim() && c.phone.trim());

    if (validContacts.length !== contacts.length) {
      showMessage(
        isFr ? 'Champs incomplets' : 'Incomplete Fields',
        isFr ? 'Veuillez remplir le nom et le telephone de chaque contact.' : 'Please fill in the name and phone for each contact.'
      );
      return;
    }

    setSaving(true);
    try {
      await emergencyContactsAPI.updateContacts(validContacts);
      setHasChanges(false);
      showMessage(
        isFr ? 'Enregistre' : 'Saved',
        isFr ? 'Contacts d\'urgence mis a jour.' : 'Emergency contacts updated.'
      );
    } catch (error: any) {
      showMessage(
        isFr ? 'Erreur' : 'Error',
        error.response?.data?.detail || (isFr ? 'Echec de la sauvegarde.' : 'Failed to save contacts.')
      );
    } finally {
      setSaving(false);
    }
  };

  const getRelationshipLabel = (value: string) => {
    const rel = RELATIONSHIPS.find(r => r.value === value);
    return rel ? (isFr ? rel.labelFr : rel.labelEn) : value;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isFr ? 'Contacts d\'Urgence' : 'Emergency Contacts'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFr ? 'Contacts d\'Urgence' : 'Emergency Contacts'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="shield-checkmark" size={24} color="#dc2626" />
            </View>
            <Text style={styles.infoText}>
              {isFr
                ? 'Ces contacts seront notifies automatiquement si vous declenchez une alerte SOS pendant une tache. Maximum 3 contacts.'
                : 'These contacts will be automatically notified if you trigger an SOS alert during a task. Maximum 3 contacts.'}
            </Text>
          </View>

          {/* Contact Cards */}
          {contacts.map((contact, index) => (
            <View key={index} style={styles.contactCard}>
              <View style={styles.contactCardHeader}>
                <Text style={styles.contactCardTitle}>
                  {isFr ? `Contact ${index + 1}` : `Contact ${index + 1}`}
                </Text>
                <TouchableOpacity
                  onPress={() => removeContact(index)}
                  style={styles.removeBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.dark.error} />
                </TouchableOpacity>
              </View>

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{isFr ? 'Nom' : 'Name'}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={18} color={Colors.dark.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={contact.name}
                    onChangeText={(text) => updateContact(index, 'name', text)}
                    placeholder={isFr ? 'Nom complet' : 'Full name'}
                    placeholderTextColor={Colors.dark.textSecondary}
                  />
                </View>
              </View>

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{isFr ? 'Telephone' : 'Phone'}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={18} color={Colors.dark.textSecondary} />
                  <TextInput
                    style={styles.input}
                    value={contact.phone}
                    onChangeText={(text) => updateContact(index, 'phone', text)}
                    placeholder="+225 07 XX XX XX XX"
                    placeholderTextColor={Colors.dark.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Relationship Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{isFr ? 'Relation' : 'Relationship'}</Text>
                <TouchableOpacity
                  style={styles.inputContainer}
                  onPress={() => setShowRelationshipPicker(
                    showRelationshipPicker === index ? null : index
                  )}
                  activeOpacity={0.7}
                >
                  <Ionicons name="people-outline" size={18} color={Colors.dark.textSecondary} />
                  <Text style={styles.pickerText}>{getRelationshipLabel(contact.relationship)}</Text>
                  <Ionicons
                    name={showRelationshipPicker === index ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Colors.dark.textSecondary}
                  />
                </TouchableOpacity>

                {showRelationshipPicker === index && (
                  <View style={styles.relationshipDropdown}>
                    {RELATIONSHIPS.map((rel) => (
                      <TouchableOpacity
                        key={rel.value}
                        style={[
                          styles.relationshipOption,
                          contact.relationship === rel.value && styles.relationshipOptionActive,
                        ]}
                        onPress={() => {
                          updateContact(index, 'relationship', rel.value);
                          setShowRelationshipPicker(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.relationshipOptionText,
                          contact.relationship === rel.value && styles.relationshipOptionTextActive,
                        ]}>
                          {isFr ? rel.labelFr : rel.labelEn}
                        </Text>
                        {contact.relationship === rel.value && (
                          <Ionicons name="checkmark" size={18} color={Colors.dark.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* Add Contact Button */}
          {contacts.length < MAX_CONTACTS && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={addContact}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={22} color={Colors.dark.primary} />
              <Text style={styles.addBtnText}>
                {isFr ? 'Ajouter un contact' : 'Add Contact'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Empty State */}
          {contacts.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Colors.dark.textSecondary} />
              <Text style={styles.emptyTitle}>
                {isFr ? 'Aucun contact d\'urgence' : 'No Emergency Contacts'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isFr
                  ? 'Ajoutez des contacts de confiance qui seront notifies en cas d\'urgence.'
                  : 'Add trusted contacts who will be notified in case of emergency.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Button */}
      {hasChanges && (
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={saveContacts}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>
                  {isFr ? 'Enregistrer' : 'Save Contacts'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.15)',
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },

  contactCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  contactCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  removeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },

  inputGroup: { marginBottom: 12 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.dark.text,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: Colors.dark.text,
  },

  relationshipDropdown: {
    marginTop: 8,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  relationshipOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  relationshipOptionActive: {
    backgroundColor: `${Colors.dark.primary}15`,
  },
  relationshipOptionText: {
    fontSize: 14,
    color: Colors.dark.text,
  },
  relationshipOptionTextActive: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.primary,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: Colors.dark.background,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dark.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});